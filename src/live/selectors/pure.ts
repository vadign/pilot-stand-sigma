import { getDistrictName } from '../../lib/districts'
import type { SigmaState } from '../../store/useSigmaStore'
import type { LiveIncidentView } from '../types'

export const selectSourceStatuses = (state: SigmaState) => state.live.sourceStatuses
export const selectOutageSummary = (state: SigmaState) => state.live.outages?.payload.summary

export const selectIncidentViewList = (state: SigmaState): LiveIncidentView[] => {
  const workflow = state.live.workflow
  const liveViews = state.live.liveIncidents.map((incident) => ({
    ...incident,
    sourceKind: 'live' as const,
    sourceBadge: '051',
    dataType: state.live.outages?.meta.type ?? 'real',
    sourceUpdatedAt: state.live.outages?.meta.updatedAt,
    statusHint: incident.detail?.recoveryTime
      ? `Ожидаемое восстановление: ${incident.detail.recoveryTime}`
      : 'Данные уровня района',
    canArchive: false,
    canResolve: false,
    liveMeta: incident,
    workflowEntries: workflow[incident.id] ?? [],
    timeline: [
      ...incident.timeline,
      ...(workflow[incident.id] ?? []).map((entry) => ({
        id: entry.id,
        at: entry.at,
        author: entry.author,
        text: entry.text,
      })),
    ],
  }))

  const mockViews = state.incidents
    .filter((incident) => incident.subsystem !== 'heat')
    .map((incident) => ({
      ...incident,
      sourceKind: 'mock' as const,
      sourceBadge: 'mock',
      dataType: 'pilot' as const,
      sourceUpdatedAt: incident.detectedAt,
      canArchive: true,
      canResolve: true,
      workflowEntries: [],
    }))

  if (state.live.mode === 'mock') return mockViews
  if (state.live.mode === 'live') return liveViews.length > 0 ? liveViews : mockViews
  return [...liveViews, ...mockViews]
}

export const selectIncidentById = (
  state: SigmaState,
  id: string,
): LiveIncidentView | undefined => selectIncidentViewList(state).find((incident) => incident.id === id)

export const selectOutageHistorySeries = (state: SigmaState) => {
  const history = state.live.liveHistory
  if (history.length === 0) return []
  return history.map((snapshot) => ({
    label: new Date(snapshot.snapshotAt).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    planned: snapshot.totals.planned,
    emergency: snapshot.totals.emergency,
    total: snapshot.totals.houses,
  }))
}

export const selectDistrictOutageCards = (state: SigmaState) =>
  (state.live.outages?.payload.summary.topDistricts ?? []).map((item) => ({
    ...item,
    districtName: getDistrictName(item.districtId ?? item.district),
  }))
