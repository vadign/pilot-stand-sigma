const sourceTypeLabels: Record<string, string> = {
  real: 'фактические',
  calculated: 'расчетные',
  simulation: 'сценарные',
  pilot: 'пилотные',
  'mock-fallback': 'демонстрационные',
}

const sourceModeLabels: Record<string, string> = {
  live: 'прямой',
  hybrid: 'гибридный',
  mock: 'демонстрационный',
}

const sourceStatusLabels: Record<string, string> = {
  idle: 'ожидание',
  loading: 'загрузка',
  ready: 'актуально',
  stale: 'устарело',
  error: 'ошибка',
}

const sourceOriginLabels: Record<string, string> = {
  runtime: 'прямой доступ',
  snapshot: 'снимок',
  cache: 'кэш',
  mock: 'демонстрационный контур',
}

const sourceBadgeLabels: Record<string, string> = {
  '051': '051',
  mock: 'ДЕМО',
}

export { sourceBadgeLabels, sourceModeLabels, sourceOriginLabels, sourceStatusLabels, sourceTypeLabels }

export const formatSourceTypeLabel = (value?: string): string => {
  if (!value) return '—'
  return sourceTypeLabels[value] ?? value
}

export const formatSourceModeLabel = (value?: string): string => {
  if (!value) return '—'
  return sourceModeLabels[value] ?? value
}

export const formatSourceStatusLabel = (value?: string): string => {
  if (!value) return '—'
  return sourceStatusLabels[value] ?? value
}

export const formatSourceOriginLabel = (value?: string): string => {
  if (!value) return '—'
  return sourceOriginLabels[value] ?? value
}

export const formatSourceBadgeLabel = (value?: string): string => {
  if (!value) return 'Сигма'
  return sourceBadgeLabels[value] ?? value
}
