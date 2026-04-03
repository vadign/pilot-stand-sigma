import { formatSourceModeLabel, formatSourceOriginLabel, formatSourceStatusLabel } from '../../lib/sourcePresentation'
import { summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'
import type {
  LiveIncidentView,
  LiveSourceMode,
  Power051Snapshot,
  SigmaLiveOutageSummary,
  SourceStatusCard,
} from '../../live/types'
import { sortIncidentsByPriority } from '../pages/shared'

export interface ExecutiveReportModel {
  title: string
  subtitle: string
  updatedAt?: string
  sourceLabel: string
  sourceStatusLabel: string
  sourceModeLabel: string
  summaryLines: string[]
  fallbackNote?: string
  kpis: Array<{ id: string; label: string; value: number | string; caption: string; tone?: 'critical' | 'warning' | 'neutral' }>
  deltaCards: Array<{ id: string; label: string; value: string; caption: string }>
  comparisonUnavailableReason?: string
  topDistricts: Array<{ district: string; houses: number; incidents: number }>
  priorityIncidents: LiveIncidentView[]
}

const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${value}`
const formatDeltaValue = (value?: number) => value === undefined ? '—' : formatSigned(value)

const pickPreviousSnapshot = (
  history: Power051Snapshot[],
  currentSnapshotAt?: string,
): Power051Snapshot | undefined =>
  [...history]
    .filter((snapshot) => snapshot.snapshotAt !== currentSnapshotAt)
    .sort((left, right) => new Date(right.snapshotAt).getTime() - new Date(left.snapshotAt).getTime())[0]

const formatSourceHost = (sourceUrl?: string): string => {
  if (!sourceUrl) return '—'

  try {
    return new URL(sourceUrl).host
  } catch {
    return sourceUrl
  }
}

export const buildExecutiveReportModel = ({
  summary,
  currentSnapshot,
  history,
  incidents,
  sourceStatus,
  sourceMode,
}: {
  summary?: SigmaLiveOutageSummary
  currentSnapshot?: Power051Snapshot
  history: Power051Snapshot[]
  incidents: LiveIncidentView[]
  sourceStatus?: SourceStatusCard
  sourceMode: LiveSourceMode
}): ExecutiveReportModel => {
  const liveIncidents = incidents.filter((incident) => incident.sourceKind === 'live')
  const emergencyIncidents = liveIncidents.filter((incident) => incident.liveMeta?.outageKind === 'emergency')
  const priorityIncidents = sortIncidentsByPriority(liveIncidents).slice(0, 5)
  const previousSnapshot = pickPreviousSnapshot(history, currentSnapshot?.snapshotAt)
  const previousSummary = previousSnapshot ? summarize051Snapshot(previousSnapshot) : undefined
  const topDistrict = summary?.topDistricts[0]?.district ?? 'без выраженного лидера'
  const sourceLabel = formatSourceHost(sourceStatus?.sourceUrl)
  const sourceStatusLabel = formatSourceStatusLabel(sourceStatus?.status)
  const sourceModeLabel = formatSourceModeLabel(sourceMode)
  const fallbackNote = sourceStatus && (sourceStatus.source !== 'runtime' || sourceStatus.type === 'mock-fallback')
    ? `Данные показаны из резервного источника: ${formatSourceOriginLabel(sourceStatus.source)}.`
    : undefined

  const summaryLines = [
    `Сейчас в городе ${summary?.activeIncidents ?? 0} активных отключения, из них ${emergencyIncidents.length} экстренных.`,
    `Наибольшая текущая нагрузка по домам наблюдается в ${topDistrict}.`,
    summary?.delta
      ? `По сравнению с предыдущим снимком число отключённых домов изменилось на ${formatSigned(summary.delta.houses)}.`
      : 'Сравнение с предыдущим снимком пока недоступно: история 051 ещё недостаточна.',
    priorityIncidents.length > 0
      ? `В фокусе остаются ${priorityIncidents.slice(0, 2).map((incident) => incident.title).join(' и ')}.`
      : 'В live-контуре сейчас нет инцидентов, требующих отдельного приоритетного разбора.',
    ...(fallbackNote ? [fallbackNote] : []),
  ]

  const districtDeltaCaption = previousSummary?.topDistricts[0]?.district && previousSummary.topDistricts[0].district !== topDistrict
    ? `Лидер сместился с ${previousSummary.topDistricts[0].district} на ${topDistrict}.`
    : `${topDistrict} удерживает максимальную нагрузку.`

  return {
    title: 'Ежедневная сводка руководителя',
    subtitle: 'ЖКХ и отключения 051 на текущий момент с сопоставлением к предыдущему снимку.',
    updatedAt: sourceStatus?.updatedAt ?? currentSnapshot?.snapshotAt,
    sourceLabel,
    sourceStatusLabel,
    sourceModeLabel,
    summaryLines,
    fallbackNote,
    kpis: [
      { id: 'active', label: 'Активные отключения', value: summary?.activeIncidents ?? 0, caption: 'текущий live-контур' },
      { id: 'houses', label: 'Отключено домов', value: summary?.totalHouses ?? 0, caption: 'суммарная текущая нагрузка' },
      { id: 'emergency', label: 'Экстренный контур', value: summary?.emergencyHouses ?? 0, caption: 'домов в экстренных событиях', tone: 'critical' },
      { id: 'district', label: 'Лидирующий район', value: topDistrict, caption: 'по числу отключённых домов', tone: 'warning' },
    ],
    deltaCards: [
      { id: 'incidents', label: 'Активные события', value: formatDeltaValue(summary?.delta?.incidents), caption: 'к предыдущему снимку' },
      { id: 'houses', label: 'Отключено домов', value: formatDeltaValue(summary?.delta?.houses), caption: 'изменение общей нагрузки' },
      { id: 'emergency', label: 'Экстренный контур', value: formatDeltaValue(summary?.delta?.emergency), caption: 'изменение экстренных домов' },
      { id: 'district', label: 'Район-лидер', value: topDistrict, caption: districtDeltaCaption },
    ],
    comparisonUnavailableReason: summary?.delta ? undefined : 'Для сравнения с предыдущим снимком 051 пока недостаточно накопленной истории.',
    topDistricts: summary?.topDistricts ?? [],
    priorityIncidents,
  }
}
