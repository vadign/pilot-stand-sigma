import type { Deputy, Incident, Regulation, ServicePerformance } from '../../types'
import type { SigmaLiveOutageSummary, SourceStatusCard } from '../../live/types'
import type { TransportFare, TransportSourceStatus, TransitStop } from '../public-transport/types'
import type { PresentationCommand } from '../presentation/types'

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
  | 'transport'
  | 'sources'
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
  | 'LIVE_SOURCES'
  | 'PUBLIC_TRANSPORT_SUMMARY'
  | 'TRANSIT_STOPS'
  | 'TRANSIT_ROUTE_LOOKUP'
  | 'TRANSIT_DISTRICT_FILTER'
  | 'TRANSIT_DISTRICT_COMPARE'
  | 'TRANSIT_ROUTE_BETWEEN_DISTRICTS'
  | 'TRANSIT_HUBS'
  | 'TRANSIT_FARES'
  | 'TRANSIT_NAVIGATE_TO_PAGE'
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
  | 'LIVE_SOURCE_STATUS'
  | 'PUBLIC_TRANSPORT_SUMMARY'
  | 'TRANSIT_STOPS'
  | 'TRANSIT_ROUTE_LOOKUP'
  | 'TRANSIT_DISTRICT_FILTER'
  | 'TRANSIT_DISTRICT_COMPARE'
  | 'TRANSIT_ROUTE_BETWEEN_DISTRICTS'
  | 'TRANSIT_HUBS'
  | 'TRANSIT_FARES'
  | 'TRANSIT_NAVIGATE_TO_PAGE'
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
  liveSummary?: SigmaLiveOutageSummary
  sourceStatuses?: SourceStatusCard[]
  publicTransport?: {
    stops: TransitStop[]
    fares: TransportFare[]
    statuses: TransportSourceStatus[]
  }
  now: string
}

export interface AskSigmaExplain {
  dataType: 'real' | 'calculated' | 'simulation' | 'pilot' | 'mock-fallback'
  source: string
  updatedAt: string
}

export type AskSigmaHint = string | {
  question: string
  description?: string
}

export interface AskSigmaAction {
  label: string
  route?: string
  incidentId?: string
  district?: string
  presentationCommand?: PresentationCommand
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
  sourceStatuses?: SourceStatusCard[]
  transportStops?: TransitStop[]
  transportFares?: TransportFare[]
  transportRoute?: { route: string; stopCount: number; districts: string[] }
  districtCompare?: { from: string; to: string; commonRoutes: string[]; count: number }

  transportRouteBetweenDistricts?: {
    from: string
    to: string
    commonRoutes: string[]
    count: number
    examplesFrom: string[]
    examplesTo: string[]
    note: string
  }
  transportHubs?: { name: string; district: string; routes: number }[]
  appliedDistrictFilter?: {
    district: string
    rawLabel?: string
    source: 'explicit' | 'implicit'
  }
  actions?: AskSigmaAction[]
  hints?: AskSigmaHint[]
  explain: AskSigmaExplain
}
