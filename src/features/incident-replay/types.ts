export type IncidentReplayPhase = 'before' | 'incident' | 'after'

export type IncidentReplayStatus =
  | 'warning-low'
  | 'warning-medium'
  | 'rule-triggered'
  | 'warning-high'
  | 'critical'
  | 'forecast-low'
  | 'forecast-medium'
  | 'forecast-high'
  | 'forecast-critical'

export type IncidentReplayAffectedObjectKind =
  | 'apartment'
  | 'kindergarten'
  | 'administrative'

export type IncidentReplaySignalKind =
  | 'moisture'
  | 'heat-loss'
  | 'pressure'
  | 'flow'
  | 'rupture'
  | 'service-impact'

export interface IncidentReplayVisualState {
  pipeSeverity: 'normal' | 'warning' | 'risk' | 'critical'
  highlightedObjectIds: string[]
  impactRadius: number
  impactOpacity: number
  signalKinds: IncidentReplaySignalKind[]
  showRupture: boolean
  zoneLabel: string
}

export interface IncidentReplayAffectedObject {
  id: string
  label: string
  shortLabel: string
  kind: IncidentReplayAffectedObjectKind
  x: number
  y: number
}

export interface IncidentReplayEvent {
  id: string
  offsetMinutes: number
  relativeTimeLabel: string
  phase: IncidentReplayPhase
  category: string
  title: string
  description: string
  probability?: number
  recommendations: string[]
  consequences?: string[]
  status: IncidentReplayStatus
  isMilestone: boolean
  keySignals: string[]
  affectedObjectIds?: string[]
  visualState: IncidentReplayVisualState
}

export interface IncidentReplayScenario {
  incidentId: string
  incidentTitle: string
  incidentStatus: string
  districtLabel: string
  sourceLabel: string
  detectedAt: string
  resourceLabel: string
  baselineSummary: string
  networkLabel: string
  pipeTypeLabel: string
  seasonLabel: string
  loadLabel: string
  affectedObjects: IncidentReplayAffectedObject[]
  events: IncidentReplayEvent[]
}
