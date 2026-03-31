import type {
  IncidentReplayPhase,
  IncidentReplaySignalKind,
  IncidentReplayStatus,
} from './types'

export const replayPhaseLabels: Record<IncidentReplayPhase, string> = {
  before: 'до инцидента',
  incident: 'инцидент',
  after: 'после инцидента',
}

export const replayPhaseBadgeStyles: Record<IncidentReplayPhase, string> = {
  before: 'border-amber-200 bg-amber-50 text-amber-700',
  incident: 'border-red-200 bg-red-100 text-red-700',
  after: 'border-cyan-200 bg-cyan-50 text-cyan-700',
}

export const replayStatusLabels: Record<IncidentReplayStatus, string> = {
  'warning-low': 'слабый сигнал',
  'warning-medium': 'подтверждённая аномалия',
  'rule-triggered': 'сработало правило',
  'warning-high': 'предаварийная фаза',
  critical: 'авария',
  'forecast-low': 'начало последствий',
  'forecast-medium': 'рост влияния',
  'forecast-high': 'масштаб реагирования вырос',
  'forecast-critical': 'межфункциональный контур',
}

export const replayStatusBadgeStyles: Record<IncidentReplayStatus, string> = {
  'warning-low': 'border-sky-200 bg-sky-50 text-sky-700',
  'warning-medium': 'border-amber-200 bg-amber-50 text-amber-700',
  'rule-triggered': 'border-violet-200 bg-violet-50 text-violet-700',
  'warning-high': 'border-orange-200 bg-orange-50 text-orange-700',
  critical: 'border-red-200 bg-red-100 text-red-700',
  'forecast-low': 'border-teal-200 bg-teal-50 text-teal-700',
  'forecast-medium': 'border-cyan-200 bg-cyan-50 text-cyan-700',
  'forecast-high': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  'forecast-critical': 'border-rose-200 bg-rose-50 text-rose-700',
}

export const replaySignalLabels: Record<IncidentReplaySignalKind, string> = {
  moisture: 'влажность в изоляции',
  'heat-loss': 'теплопотери',
  pressure: 'падение давления',
  flow: 'подпитка и расход',
  rupture: 'разгерметизация',
  'service-impact': 'влияние на потребителей',
}

export const replaySignalColors: Record<IncidentReplaySignalKind, string> = {
  moisture: '#0ea5e9',
  'heat-loss': '#f59e0b',
  pressure: '#ef4444',
  flow: '#8b5cf6',
  rupture: '#b91c1c',
  'service-impact': '#0891b2',
}

export const replayPipeColors = {
  normal: '#93c5fd',
  warning: '#f59e0b',
  risk: '#f97316',
  critical: '#dc2626',
} as const
