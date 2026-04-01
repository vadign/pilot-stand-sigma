import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationSessionManager } from './sessionManager'
import {
  FilePresentationSessionStorage,
  MemoryPresentationSessionStorage,
} from './storage'

describe('PresentationSessionManager', () => {
  let manager: PresentationSessionManager
  let tempDir: string | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'))
    manager = new PresentationSessionManager({
      ttlMs: 1_000,
      heartbeatMs: 100,
      cleanupMs: 50,
      now: () => Date.now(),
      storage: new MemoryPresentationSessionStorage(),
    })
  })

  afterEach(() => {
    manager.destroy()
    if (tempDir) {
      rmSync(tempDir, { force: true, recursive: true })
      tempDir = undefined
    }
    vi.useRealTimers()
  })

  it('creates a session and returns urls and idle scene through info', () => {
    const created = manager.createSession('https://sigma.test')
    const info = manager.getInfo(created.sid, 'https://sigma.test')

    expect(info.mobileUrl).toBe(`https://sigma.test/mobile?s=${created.sid}`)
    expect(info.displayUrl).toBe(`https://sigma.test/display?s=${created.sid}`)
    expect(info.scene.type).toBe('idle')
    expect(info.previousScene).toBeUndefined()
    expect(info.historyDepth).toBe(0)
  })

  it('sends snapshot immediately and heartbeat events while subscribed', () => {
    const created = manager.createSession('https://sigma.test')
    const events: string[] = []

    const unsubscribe = manager.subscribe(created.sid, 'https://sigma.test', {
      send: (event) => {
        events.push(event.type)
      },
    })

    expect(events[0]).toBe('snapshot')

    vi.advanceTimersByTime(100)

    expect(events).toContain('heartbeat')

    unsubscribe()
  })

  it('restores the last answer scene for new subscribers and emits command events', () => {
    const created = manager.createSession('https://sigma.test')
    const emittedEvents: Array<{ type: string; payload?: unknown }> = []

    manager.subscribe(created.sid, 'https://sigma.test', {
      send: (event) => {
        emittedEvents.push(event)
      },
    })

    manager.submitCommand(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      command: {
        type: 'SHOW_ANSWER',
        query: 'сводка за 24 часа',
        result: {
          type: 'BRIEFING',
          title: 'Сводка за 24 часа',
          summary: 'test',
          actions: [{ label: 'Открыть сводку', route: '/briefing' }],
          explain: { dataType: 'real', source: 'test', updatedAt: '2026-04-01T12:00:00.000Z' },
        },
      },
    })

    expect(emittedEvents.some((event) => event.type === 'command')).toBe(true)

    const replayedEvents: Array<{ type: string; payload?: unknown }> = []
    manager.subscribe(created.sid, 'https://sigma.test', {
      send: (event) => {
        replayedEvents.push(event)
      },
    })

    expect(replayedEvents[0]?.type).toBe('snapshot')
    expect(replayedEvents[0]?.payload).toMatchObject({
      scene: {
        type: 'answer',
        query: 'сводка за 24 часа',
        actions: [{ label: 'Открыть сводку', route: '/briefing' }],
      },
      historyDepth: 1,
      previousScene: { type: 'idle' },
    })
  })

  it('returns controller conflict and allows explicit takeover', () => {
    const created = manager.createSession('https://sigma.test')

    const first = manager.submitPresent(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      route: '/briefing',
      label: 'Брифинг',
    })

    expect('error' in first).toBe(false)

    const conflict = manager.submitPresent(created.sid, 'https://sigma.test', {
      clientId: 'mobile-b',
      route: '/history',
      label: 'История',
    })

    expect(conflict).toMatchObject({
      error: 'controller_conflict',
      controller: { clientId: 'mobile-a' },
    })

    const takeover = manager.submitPresent(created.sid, 'https://sigma.test', {
      clientId: 'mobile-b',
      route: '/history',
      label: 'История',
      takeover: true,
    })

    expect('error' in takeover).toBe(false)
    if ('error' in takeover) return
    expect(takeover.controller?.clientId).toBe('mobile-b')
    expect(takeover.scene).toMatchObject({ type: 'page', route: '/history', pageKey: 'history' })
  })

  it('restores the previous scene through RESTORE_PREVIOUS_SCENE', () => {
    const created = manager.createSession('https://sigma.test')

    manager.submitPresent(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      route: '/briefing?focus=incidents',
      label: 'Брифинг',
    })

    const shownAnswer = manager.submitCommand(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      command: {
        type: 'SHOW_ANSWER',
        query: 'сводка',
        result: {
          type: 'BRIEFING',
          title: 'Сводка',
          explain: { dataType: 'pilot', source: 'test', updatedAt: '2026-04-01T12:00:00.000Z' },
        },
      },
    })

    expect('error' in shownAnswer).toBe(false)

    const restored = manager.submitCommand(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      command: { type: 'RESTORE_PREVIOUS_SCENE' },
    })

    expect('error' in restored).toBe(false)
    if ('error' in restored) return
    expect(restored.scene).toMatchObject({
      type: 'page',
      route: '/briefing?focus=incidents',
      pageKey: 'briefing',
      state: { pageKey: 'briefing', focus: 'incidents' },
    })
    expect(restored.previousScene).toMatchObject({ type: 'answer' })
  })

  it('rehydrates persisted sessions from file-backed storage', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'sigma-presentation-'))
    const storage = new FilePresentationSessionStorage(join(tempDir, 'sessions.json'))

    const persistedManager = new PresentationSessionManager({
      ttlMs: 10_000,
      heartbeatMs: 100,
      cleanupMs: 50,
      now: () => Date.now(),
      storage,
    })

    const created = persistedManager.createSession('https://sigma.test')
    persistedManager.submitPresent(created.sid, 'https://sigma.test', {
      clientId: 'mobile-a',
      route: '/history?period=1q&focus=districts',
      label: 'История',
    })
    persistedManager.destroy()

    const restoredManager = new PresentationSessionManager({
      ttlMs: 10_000,
      heartbeatMs: 100,
      cleanupMs: 50,
      now: () => Date.now(),
      storage,
    })

    const restored = restoredManager.getInfo(created.sid, 'https://sigma.test')
    expect(restored.scene).toMatchObject({
      type: 'page',
      route: '/history?period=1q&focus=districts',
      pageKey: 'history',
      state: { pageKey: 'history', period: '1q', focus: 'districts' },
    })

    restoredManager.destroy()
  })

  it('expires inactive sessions after ttl and cleanup', () => {
    const created = manager.createSession('https://sigma.test')

    vi.advanceTimersByTime(1_100)
    manager.cleanupExpiredSessions()

    expect(() => manager.getInfo(created.sid, 'https://sigma.test')).toThrow(
      `Presentation session not found: ${created.sid}`,
    )
  })
})
