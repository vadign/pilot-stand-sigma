import type { Deputy, Incident, Regulation, ServicePerformance } from '../../types'

export type SigmaRole = 'мэр' | 'диспетчер' | 'аналитик'
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface AskSigmaQuery {
  raw: string
  normalized: string
  tokens: string[]
  stems: string[]
  numbers: number[]
}

export type AskSigmaEntity =
  | 'incident'
  | 'regulation'
  | 'history'
  | 'scenario'
  | 'deputy'
  | 'approval'
  | 'dashboard'
  | 'briefing'
  | 'map'
  | 'help'

export interface AskSigmaIntent {
  type: 'role_switch' | 'navigate' | 'focus' | 'query'
  entity?: AskSigmaEntity
  role?: SigmaRole
  district?: string
  route?: string
  confidence: number
}

export type AskSigmaOperation =
  | 'COUNT'
  | 'GROUP'
  | 'FILTER'
  | 'SUMMARY'
  | 'BRIEFING'
  | 'INCIDENT_DETAIL'
  | 'REGULATION_GUIDANCE'
  | 'REGULATION_LOOKUP'
  | 'HISTORY_TREND'
  | 'SCENARIO_LOOKUP'
  | 'SCENARIO_COMPARE'
  | 'DEPUTY_STATUS'
  | 'DEPUTY_MODE_CHANGE'
  | 'APPROVALS'
  | 'NAVIGATE'
  | 'HELP'
  | 'UNKNOWN'

export interface AskSigmaPlan {
  operation: AskSigmaOperation
  entity?: AskSigmaEntity
  filters?: Record<string, string | number | boolean>
  incidentId?: string
  district?: string
  role?: SigmaRole
  route?: string
  text: string
}

export type AskSigmaResultType =
  | 'ROLE_SWITCH'
  | 'NAVIGATE'
  | 'SUMMARY'
  | 'BRIEFING'
  | 'INCIDENT_LIST'
  | 'INCIDENT_DETAIL'
  | 'APPROVALS'
  | 'REGULATION_LOOKUP'
  | 'REGULATION_GUIDANCE'
  | 'HISTORY_ANALYTICS'
  | 'SCENARIO_LOOKUP'
  | 'SCENARIO_COMPARE'
  | 'DEPUTY_STATUS'
  | 'DEPUTY_MODE_CHANGE'
  | 'HELP'
  | 'UNKNOWN'

export interface AskSigmaContext {
  role: SigmaRole
  district?: string
  incidents: Incident[]
  regulations: Regulation[]
  scenarios: { id: string; title: string; description: string; serviceLoad: number; impacts: { label: string; value: number }[] }[]
  deputies: Deputy[]
  servicePerformance: ServicePerformance[]
  notifications: { id: string; text: string; level: string; createdAt: string }[]
  now: string
}

export interface AskSigmaExplain {
  dataType: 'real' | 'calculated' | 'simulation' | 'pilot'
  source: string
  updatedAt: string
}

export interface AskSigmaResult {
  type: AskSigmaResultType
  title: string
  summary?: string
  text?: string
  kpis?: { label: string; value: string }[]
  incidents?: Incident[]
  incident?: Incident
  regulations?: Regulation[]
  scenario?: AskSigmaContext['scenarios'][number]
  compare?: { baseline: string; intervention: string; effects: string[] }
  deputy?: Deputy
  approvals?: { id: string; reason: string; initiator: string }[]
  actions?: { label: string; route?: string; incidentId?: string; district?: string }[]
  hints?: string[]
  explain: AskSigmaExplain
}
