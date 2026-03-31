import type { Incident } from '../types'
import { getOutageKindLabel } from '../live/outageKindLabels'
import { getOutageCompactCaption, getOutageTitle, getUtilityLabel } from '../live/outagePresentation'
import { getDistrictName } from './districts'
import { formatSourceBadgeLabel } from './sourcePresentation'

type MapIncidentInput = Incident & {
  sourceBadge?: string
  liveMeta?: {
    outageKind?: string
    utilityType?: string
  } | null
}

export interface IncidentMapPresentation {
  title: string
  caption: string
  hint: string
  bodyRows: Array<{ label: string; value: string }>
  footer: string
}

const subsystemLabels: Record<string, string> = {
  heat: 'Энергетика',
  utilities: 'ЖКХ',
  roads: 'Дороги',
  noise: 'Шум и безопасность',
  air: 'Качество воздуха',
  transport: 'Общественный транспорт',
}

const sourceLabels: Record<string, string> = {
  s1: 'ЕДДС 051',
  s2: 'Датчики воздуха Кольцово',
  s3: 'Расчет индекса загруженности',
  s4: 'Сценарный модуль',
  'live-051': '051 Новосибирск',
}

const hasCyrillic = (value?: string): boolean => /[А-Яа-яЁё]/.test(value ?? '')
const normalizeText = (value?: string): string => (value ?? '').replace(/\s+/g, ' ').trim()
const truncateText = (value: string, maxLength = 40): string => value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value
const isOutageKind = (value?: string): value is 'planned' | 'emergency' => value === 'planned' || value === 'emergency'

const getSubsystemLabel = (incident: MapIncidentInput): string => subsystemLabels[incident.subsystem] ?? 'Городской контур'
const getSourceLabel = (incident: MapIncidentInput): string =>
  sourceLabels[incident.sourceId] ?? formatSourceBadgeLabel(incident.sourceBadge) ?? 'Сигма'

const getIncidentTitle = (incident: MapIncidentInput): string => {
  const liveOutageKind = incident.liveMeta?.outageKind
  if (isOutageKind(liveOutageKind)) {
    return getOutageTitle(liveOutageKind, incident.liveMeta?.utilityType)
  }

  const title = normalizeText(incident.title)
  if (title && hasCyrillic(title)) return title

  const districtLabel = getDistrictName(incident.district)
  const subsystemLabel = getSubsystemLabel(incident)
  return districtLabel ? `${subsystemLabel}: ${districtLabel}` : subsystemLabel
}

const formatDetectedAt = (value?: string): string => {
  if (!value) return 'время не указано'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getIncidentMapPresentation = (incident: MapIncidentInput): IncidentMapPresentation => {
  const title = getIncidentTitle(incident)
  const liveOutageKind = incident.liveMeta?.outageKind
  const districtLabel = getDistrictName(incident.district) || 'район не указан'
  const summary = normalizeText(incident.summary)
  const sourceLabel = getSourceLabel(incident)
  const bodyRows: IncidentMapPresentation['bodyRows'] = [
    { label: 'Район', value: districtLabel },
    { label: 'Подсистема', value: getSubsystemLabel(incident) },
    { label: 'Статус', value: incident.status },
    { label: 'Критичность', value: incident.severity },
    { label: 'Источник', value: sourceLabel },
  ]

  if (isOutageKind(liveOutageKind)) {
    bodyRows.splice(2, 0, { label: 'Тип события', value: `${getOutageKindLabel(liveOutageKind, 'titleSingular')} отключение` })
    bodyRows.splice(3, 0, { label: 'Ресурс', value: getUtilityLabel(incident.liveMeta?.utilityType) })
  }

  if (summary && hasCyrillic(summary)) {
    bodyRows.push({ label: 'Сводка', value: summary })
  }

  return {
    title,
    caption: isOutageKind(liveOutageKind)
      ? getOutageCompactCaption(liveOutageKind, incident.liveMeta?.utilityType)
      : truncateText(title),
    hint: `${title} · ${districtLabel}`,
    bodyRows,
    footer: `Зафиксировано: ${formatDetectedAt(incident.detectedAt)}`,
  }
}
