import { randomBytes } from 'node:crypto'
import {
  buildOpenPageCommandFromRoute,
  buildPageLabel,
  buildRouteFromPatch,
  buildRouteFromState,
  getDefaultPresentationState,
  isValidPresentationRoute,
  parseRouteToState,
} from '../adapters'
import { getPresentationPreset } from '../presets'
import type {
  PresentationActionPayload,
  PresentationAnswerScene,
  PresentationAskRequest,
  PresentationClearToIdleCommand,
  PresentationCommand,
  PresentationCommandEnvelope,
  PresentationCommandRequest,
  PresentationControllerConflict,
  PresentationIdleScene,
  PresentationPageScene,
  PresentationPresentRequest,
  PresentationScene,
  PresentationSessionInfo,
  PresentationSessionStreamEvent,
  PresentationShowAnswerCommand,
} from '../types'
import {
  createDefaultPresentationSessionStorage,
  type PersistedPresentationSessionRecord,
  type PresentationSessionStorage,
} from './storage'

export const PRESENTATION_SESSION_TTL_MS = 8 * 60 * 60 * 1000
export const PRESENTATION_HEARTBEAT_MS = 20_000
export const PRESENTATION_CLEANUP_MS = 60_000
export const PRESENTATION_HISTORY_LIMIT = 20
export const PRESENTATION_COMMAND_LOG_LIMIT = 200

export interface PresentationSessionEventSink {
  send: (event: PresentationSessionStreamEvent) => void
  close?: () => void
}

interface PresentationSubscription {
  sink: PresentationSessionEventSink
  heartbeatTimer: ReturnType<typeof setInterval>
}

interface PresentationSessionRecord extends PersistedPresentationSessionRecord {
  subscriptions: Set<PresentationSubscription>
}

export interface PresentationSessionManagerOptions {
  ttlMs?: number
  heartbeatMs?: number
  cleanupMs?: number
  now?: () => number
  storage?: PresentationSessionStorage
}

const createSid = () => randomBytes(6).toString('hex')

const createOriginUrl = (origin: string, path: string) => new URL(path, origin).toString()

const createIdleScene = (requestedAt: string): PresentationIdleScene => ({
  type: 'idle',
  requestedAt,
})

const cloneScene = <T extends PresentationScene | undefined>(scene: T): T =>
  scene ? structuredClone(scene) as T : scene

const normalizeAnswerActions = (
  command: PresentationShowAnswerCommand,
): PresentationActionPayload[] => command.actions ?? command.result.actions ?? []

export class PresentationSessionManager {
  private readonly sessions = new Map<string, PresentationSessionRecord>()
  private readonly ttlMs: number
  private readonly heartbeatMs: number
  private readonly now: () => number
  private readonly storage: PresentationSessionStorage
  private readonly cleanupTimer: ReturnType<typeof setInterval>

  constructor(options: PresentationSessionManagerOptions = {}) {
    this.ttlMs = options.ttlMs ?? PRESENTATION_SESSION_TTL_MS
    this.heartbeatMs = options.heartbeatMs ?? PRESENTATION_HEARTBEAT_MS
    this.now = options.now ?? (() => Date.now())
    this.storage = options.storage ?? createDefaultPresentationSessionStorage()
    this.rehydrateSessions()
    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), options.cleanupMs ?? PRESENTATION_CLEANUP_MS)
    this.cleanupTimer.unref?.()
  }

  destroy() {
    clearInterval(this.cleanupTimer)
    for (const session of this.sessions.values()) {
      this.closeSubscriptions(session)
    }
    this.persist()
    this.sessions.clear()
  }

  createSession(origin: string): PresentationSessionInfo {
    const createdAt = this.now()
    const requestedAt = new Date(createdAt).toISOString()
    const sid = createSid()
    const session: PresentationSessionRecord = {
      sid,
      createdAt,
      touchedAt: createdAt,
      scene: createIdleScene(requestedAt),
      previousScene: undefined,
      history: [],
      commandLog: [],
      controller: undefined,
      subscriptions: new Set(),
    }
    this.sessions.set(sid, session)
    this.persist()
    return this.buildInfo(session, origin)
  }

  getInfo(sid: string, origin: string): PresentationSessionInfo {
    const session = this.getSessionOrThrow(sid)
    this.touch(session)
    this.persist()
    return this.buildInfo(session, origin)
  }

  subscribe(sid: string, origin: string, sink: PresentationSessionEventSink): () => void {
    const session = this.getSessionOrThrow(sid)
    this.touch(session)
    this.persist()

    const heartbeatTimer = setInterval(() => {
      sink.send({
        type: 'heartbeat',
        payload: { at: new Date(this.now()).toISOString() },
      })
    }, this.heartbeatMs)
    heartbeatTimer.unref?.()

    const subscription: PresentationSubscription = { sink, heartbeatTimer }
    session.subscriptions.add(subscription)
    sink.send({ type: 'snapshot', payload: this.buildInfo(session, origin) })

    return () => {
      clearInterval(heartbeatTimer)
      session.subscriptions.delete(subscription)
    }
  }

  submitCommand(
    sid: string,
    origin: string,
    request: PresentationCommandRequest,
  ): PresentationSessionInfo | PresentationControllerConflict {
    const session = this.getSessionOrThrow(sid)
    const controller = this.acquireController(session, request.clientId, Boolean(request.takeover))
    if (controller) return controller

    const envelope: PresentationCommandEnvelope = {
      clientId: request.clientId,
      command: request.command,
      receivedAt: new Date(this.now()).toISOString(),
    }

    this.pushCommandLog(session, envelope)
    this.broadcast(session, { type: 'command', payload: envelope })

    this.applyCommand(session, origin, request.command)
    this.persist()
    return this.buildInfo(session, origin)
  }

  submitAsk(
    sid: string,
    origin: string,
    request: PresentationAskRequest,
  ): PresentationSessionInfo | PresentationControllerConflict {
    const command = request.command ?? (() => {
      if (!request.query || !request.result) {
        throw new Error('query and result are required for legacy ask requests')
      }
      return {
        type: 'SHOW_ANSWER',
        query: request.query,
        result: request.result,
        actions: request.result.actions ?? [],
      } satisfies PresentationShowAnswerCommand
    })()

    return this.submitCommand(sid, origin, {
      clientId: request.clientId,
      command,
      takeover: request.takeover,
    })
  }

  submitPresent(
    sid: string,
    origin: string,
    request: PresentationPresentRequest,
  ): PresentationSessionInfo | PresentationControllerConflict {
    if (!isValidPresentationRoute(request.route)) {
      throw new Error(`Invalid presentation route: ${request.route}`)
    }

    return this.submitCommand(sid, origin, {
      clientId: request.clientId,
      command: buildOpenPageCommandFromRoute(request.route, request.label),
      takeover: request.takeover,
    })
  }

  cleanupExpiredSessions() {
    const threshold = this.now() - this.ttlMs
    let changed = false

    for (const [sid, session] of this.sessions.entries()) {
      if (session.touchedAt > threshold) continue
      this.closeSubscriptions(session)
      this.sessions.delete(sid)
      changed = true
    }

    if (changed) this.persist()
  }

  private rehydrateSessions() {
    const threshold = this.now() - this.ttlMs

    for (const session of this.storage.load()) {
      if (session.touchedAt <= threshold) continue
      this.sessions.set(session.sid, {
        ...session,
        subscriptions: new Set(),
      })
    }
  }

  private persist() {
    const records = Array.from(this.sessions.values()).map<PersistedPresentationSessionRecord>((session) => ({
      sid: session.sid,
      createdAt: session.createdAt,
      touchedAt: session.touchedAt,
      scene: session.scene,
      previousScene: session.previousScene,
      history: session.history,
      commandLog: session.commandLog,
      controller: session.controller,
    }))

    this.storage.save(records)
  }

  private getSessionOrThrow(sid: string): PresentationSessionRecord {
    const session = this.sessions.get(sid)
    if (!session) {
      throw new Error(`Presentation session not found: ${sid}`)
    }
    return session
  }

  private touch(session: PresentationSessionRecord) {
    session.touchedAt = this.now()
  }

  private acquireController(
    session: PresentationSessionRecord,
    clientId: string,
    takeover: boolean,
  ): PresentationControllerConflict | null {
    this.touch(session)

    if (session.controller && session.controller.clientId !== clientId && !takeover) {
      return {
        error: 'controller_conflict',
        controller: session.controller,
      }
    }

    const previousController = session.controller?.clientId
    session.controller = {
      clientId,
      claimedAt: new Date(this.now()).toISOString(),
    }

    if (previousController !== clientId) {
      this.broadcast(session, {
        type: 'controller',
        payload: session.controller,
      })
    }

    return null
  }

  private pushCommandLog(session: PresentationSessionRecord, envelope: PresentationCommandEnvelope) {
    session.commandLog = [envelope, ...session.commandLog].slice(0, PRESENTATION_COMMAND_LOG_LIMIT)
  }

  private applyCommand(
    session: PresentationSessionRecord,
    origin: string,
    command: PresentationCommand,
    depth = 0,
  ) {
    if (depth > 8) {
      throw new Error('Presentation command recursion limit exceeded')
    }

    switch (command.type) {
      case 'OPEN_PAGE': {
        const route = buildRouteFromState(command.page)
        if (!isValidPresentationRoute(route)) {
          throw new Error(`Invalid presentation route: ${route}`)
        }
        const state = parseRouteToState(route)
        const scene: PresentationPageScene = {
          type: 'page',
          route,
          label: command.label ?? buildPageLabel(state),
          pageKey: state.pageKey,
          state,
          requestedAt: new Date(this.now()).toISOString(),
        }
        this.publishScene(session, origin, scene)
        return
      }

      case 'PATCH_PAGE_STATE': {
        const baseState =
          session.scene.type === 'page' && session.scene.pageKey === command.pageKey
            ? session.scene.state
            : getDefaultPresentationState(command.pageKey)
        const next = buildRouteFromPatch(baseState, command)
        if (!isValidPresentationRoute(next.route)) {
          throw new Error(`Invalid presentation route: ${next.route}`)
        }
        const scene: PresentationPageScene = {
          type: 'page',
          route: next.route,
          label: next.label,
          pageKey: next.state.pageKey,
          state: next.state,
          requestedAt: new Date(this.now()).toISOString(),
        }
        this.publishScene(session, origin, scene)
        return
      }

      case 'SHOW_ANSWER': {
        const scene: PresentationAnswerScene = {
          type: 'answer',
          query: command.query,
          result: command.result,
          actions: normalizeAnswerActions(command),
          requestedAt: new Date(this.now()).toISOString(),
        }
        this.publishScene(session, origin, scene)
        return
      }

      case 'RUN_ACTION': {
        const action = this.resolveAnswerAction(session, command.actionIndex)
        if (!action) {
          throw new Error(`Answer action ${command.actionIndex} not found`)
        }
        if (action.presentationCommand) {
          this.applyCommand(session, origin, action.presentationCommand, depth + 1)
          return
        }
        if (!action.route) {
          throw new Error(`Answer action ${command.actionIndex} has no presentation target`)
        }
        const route = this.resolveActionRoute(action)
        this.applyCommand(session, origin, buildOpenPageCommandFromRoute(route, action.label), depth + 1)
        return
      }

      case 'APPLY_PRESET': {
        const preset = getPresentationPreset(command.presetId)
        if (!preset) {
          throw new Error(`Presentation preset not found: ${command.presetId}`)
        }
        preset.commands.forEach((presetCommand) => {
          this.applyCommand(session, origin, presetCommand, depth + 1)
        })
        return
      }

      case 'RESTORE_PREVIOUS_SCENE': {
        const target = cloneScene(session.previousScene) ?? createIdleScene(new Date(this.now()).toISOString())
        this.publishScene(session, origin, target)
        return
      }

      case 'CLEAR_TO_IDLE': {
        const clearCommand: PresentationClearToIdleCommand = command
        void clearCommand
        this.publishScene(session, origin, createIdleScene(new Date(this.now()).toISOString()))
        return
      }
    }
  }

  private resolveAnswerAction(session: PresentationSessionRecord, actionIndex: number): PresentationActionPayload | undefined {
    if (session.scene.type === 'answer') return session.scene.actions[actionIndex]
    if (session.previousScene?.type === 'answer') return session.previousScene.actions[actionIndex]

    const historicalAnswer = session.history.find((scene): scene is PresentationAnswerScene => scene.type === 'answer')
    return historicalAnswer?.actions[actionIndex]
  }

  private resolveActionRoute(action: PresentationActionPayload): string {
    if (!action.route) {
      throw new Error('Presentation action route is missing')
    }

    if (action.route === '/operations' && action.district) {
      const url = new URL(action.route, 'https://sigma.local')
      url.searchParams.set('district', action.district)
      return `${url.pathname}${url.search}`
    }

    return action.route
  }

  private publishScene(
    session: PresentationSessionRecord,
    origin: string,
    scene: PresentationScene,
  ) {
    session.previousScene = cloneScene(session.scene)
    session.history = [cloneScene(session.scene), ...session.history].filter(Boolean).slice(0, PRESENTATION_HISTORY_LIMIT) as PresentationScene[]
    session.scene = scene
    this.touch(session)
    this.broadcast(session, { type: 'scene', payload: scene })
    this.broadcast(session, { type: 'snapshot', payload: this.buildInfo(session, origin) })
  }

  private buildInfo(session: PresentationSessionRecord, origin: string): PresentationSessionInfo {
    return {
      sid: session.sid,
      expiresAt: new Date(session.touchedAt + this.ttlMs).toISOString(),
      scene: session.scene,
      previousScene: session.previousScene,
      historyDepth: session.history.length,
      controller: session.controller,
      mobileUrl: createOriginUrl(origin, `/mobile?s=${session.sid}`),
      displayUrl: createOriginUrl(origin, `/display?s=${session.sid}`),
    }
  }

  private broadcast(session: PresentationSessionRecord, event: PresentationSessionStreamEvent) {
    for (const subscription of session.subscriptions) {
      subscription.sink.send(event)
    }
  }

  private closeSubscriptions(session: PresentationSessionRecord) {
    for (const subscription of session.subscriptions) {
      clearInterval(subscription.heartbeatTimer)
      subscription.sink.close?.()
    }
    session.subscriptions.clear()
  }
}
