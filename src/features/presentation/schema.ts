export type PresentationRole = 'mobile' | 'display' | 'viewer'

export type PresentationPageKey =
  | 'mayor-dashboard'
  | 'operations'
  | 'briefing'
  | 'history'
  | 'other'

export type PresentationSubsystemId =
  | 'heat'
  | 'transport'
  | 'education'
  | 'roads'
  | 'noise'
  | 'air'
export type MayorDashboardViewMode = 'map' | 'list'
export type PresentationTransportFocus =
  | 'overview'
  | 'map'
  | 'list'
  | 'hubs'
  | 'fares'
  | 'connectivity'
export type OperationsPresentationSubsystem = Extract<PresentationSubsystemId, 'heat' | 'roads' | 'noise' | 'air'>
export type OperationsSourceFilter = 'all' | 'live' | 'mock'
export type BriefingFocus = 'summary' | 'incidents' | 'districts'
export type HistoryPeriod = '7d' | '1m' | '1q' | '1y'
export type HistoryFocus = 'trend' | 'map' | 'categories' | 'districts'

export interface MayorDashboardPresentationState {
  pageKey: 'mayor-dashboard'
  subsystem: PresentationSubsystemId
  district: string
  view: MayorDashboardViewMode
  mode: string
  route: string
  fromDistrict: string
  toDistrict: string
  focus: PresentationTransportFocus
  pavilionOnly: boolean
}

export interface OperationsPresentationState {
  pageKey: 'operations'
  subsystem: OperationsPresentationSubsystem
  severity: string
  source: OperationsSourceFilter
  utility: string
  outageKind: string
  district: string
  selected: string
}

export interface BriefingPresentationState {
  pageKey: 'briefing'
  focus: BriefingFocus
  incident: string
}

export interface HistoryPresentationState {
  pageKey: 'history'
  period: HistoryPeriod
  focus: HistoryFocus
}

export interface OtherPresentationState {
  pageKey: 'other'
  route: string
}

export type PresentationPageState =
  | MayorDashboardPresentationState
  | OperationsPresentationState
  | BriefingPresentationState
  | HistoryPresentationState
  | OtherPresentationState
