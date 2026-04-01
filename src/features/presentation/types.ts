import type { AskSigmaResult } from '../ask-sigma/types'
import type {
  BriefingPresentationState,
  HistoryPresentationState,
  MayorDashboardPresentationState,
  OperationsPresentationState,
  OtherPresentationState,
  PresentationPageKey,
  PresentationPageState,
  PresentationRole,
} from './schema'

export type {
  BriefingFocus,
  BriefingPresentationState,
  HistoryFocus,
  HistoryPeriod,
  HistoryPresentationState,
  MayorDashboardPresentationState,
  MayorDashboardViewMode,
  OperationsPresentationState,
  OperationsPresentationSubsystem,
  OperationsSourceFilter,
  OtherPresentationState,
  PresentationPageKey,
  PresentationPageState,
  PresentationRole,
  PresentationSubsystemId,
  PresentationTransportFocus,
} from './schema'

export interface PresentationController {
  clientId: string
  claimedAt: string
}

export interface PresentationIdleScene {
  type: 'idle'
  requestedAt: string
}

export type PresentationActionPayload = NonNullable<AskSigmaResult['actions']>[number]

export interface PresentationAnswerScene {
  type: 'answer'
  query: string
  result: AskSigmaResult
  actions: PresentationActionPayload[]
  requestedAt: string
}

export interface PresentationPageScene {
  type: 'page'
  route: string
  label: string
  pageKey: PresentationPageKey
  state: PresentationPageState
  requestedAt: string
}

export type PresentationScene =
  | PresentationIdleScene
  | PresentationAnswerScene
  | PresentationPageScene

export interface PresentationSessionInfo {
  sid: string
  expiresAt: string
  scene: PresentationScene
  previousScene?: PresentationScene
  historyDepth: number
  controller?: PresentationController
  mobileUrl: string
  displayUrl: string
}

export interface PresentationCreateSessionResponse {
  sid: string
  expiresAt: string
}

export interface PresentationOpenPageCommand {
  type: 'OPEN_PAGE'
  page: PresentationPageState
  label?: string
}

export type PresentationPatchPageStateCommand =
  | {
      type: 'PATCH_PAGE_STATE'
      pageKey: 'mayor-dashboard'
      patch: Partial<Omit<MayorDashboardPresentationState, 'pageKey'>>
      label?: string
    }
  | {
      type: 'PATCH_PAGE_STATE'
      pageKey: 'operations'
      patch: Partial<Omit<OperationsPresentationState, 'pageKey'>>
      label?: string
    }
  | {
      type: 'PATCH_PAGE_STATE'
      pageKey: 'briefing'
      patch: Partial<Omit<BriefingPresentationState, 'pageKey'>>
      label?: string
    }
  | {
      type: 'PATCH_PAGE_STATE'
      pageKey: 'history'
      patch: Partial<Omit<HistoryPresentationState, 'pageKey'>>
      label?: string
    }
  | {
      type: 'PATCH_PAGE_STATE'
      pageKey: 'other'
      patch: Partial<Omit<OtherPresentationState, 'pageKey'>>
      label?: string
    }

export interface PresentationShowAnswerCommand {
  type: 'SHOW_ANSWER'
  query: string
  result: AskSigmaResult
  actions?: PresentationActionPayload[]
}

export interface PresentationRunActionCommand {
  type: 'RUN_ACTION'
  actionIndex: number
}

export interface PresentationApplyPresetCommand {
  type: 'APPLY_PRESET'
  presetId: string
}

export interface PresentationRestorePreviousSceneCommand {
  type: 'RESTORE_PREVIOUS_SCENE'
}

export interface PresentationClearToIdleCommand {
  type: 'CLEAR_TO_IDLE'
}

export type PresentationCommand =
  | PresentationOpenPageCommand
  | PresentationPatchPageStateCommand
  | PresentationShowAnswerCommand
  | PresentationRunActionCommand
  | PresentationApplyPresetCommand
  | PresentationRestorePreviousSceneCommand
  | PresentationClearToIdleCommand

export interface PresentationCommandEnvelope {
  clientId: string
  command: PresentationCommand
  receivedAt: string
}

export interface PresentationCommandRequest {
  clientId: string
  command: PresentationCommand
  takeover?: boolean
}

export interface PresentationAskRequest {
  clientId: string
  query?: string
  result?: AskSigmaResult
  command?: PresentationShowAnswerCommand
  takeover?: boolean
}

export interface PresentationPresentRequest {
  clientId: string
  route: string
  label: string
  takeover?: boolean
}

export interface PresentationSessionQuery {
  clientId: string
  role: PresentationRole
}

export interface PresentationControllerConflict {
  error: 'controller_conflict'
  controller?: PresentationController
}

export interface PresentationHeartbeatEvent {
  at: string
}

export type PresentationSessionStreamEvent =
  | { type: 'snapshot'; payload: PresentationSessionInfo }
  | { type: 'scene'; payload: PresentationScene }
  | { type: 'controller'; payload?: PresentationController }
  | { type: 'command'; payload: PresentationCommandEnvelope }
  | { type: 'heartbeat'; payload: PresentationHeartbeatEvent }
