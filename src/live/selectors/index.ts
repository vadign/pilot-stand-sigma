import { useMemo } from 'react'
import { getDistrictName } from '../../lib/districts'
import type { SigmaState } from '../../store/useSigmaStore'
import { useSigmaStore } from '../../store/useSigmaStore'
import type { LiveIncidentView } from '../types'

export const selectSourceStatuses = (state: SigmaState) => state.live.sourceStatuses
export const selectOutageSummary = (state: SigmaState) => state.live.outages?.payload.summary
export const selectConstructionAggregates = (state: SigmaState) => state.live.construction?.payload.aggregates ?? []
export const selectConstructionBundle = (state: SigmaState) => state.live.construction?.payload

export const selectIncidentViewList = (state: SigmaState): LiveIncidentView[] => {
  const workflow = state.live.workflow
  const liveViews = state.live.liveIncidents.map((incident) => ({
    ...incident,
    sourceKind: 'live' as const,
    sourceBadge: '051',
    dataType: state.live.outages?.meta.type ?? 'real',
    sourceUpdatedAt: state.live.outages?.meta.updatedAt,
    statusHint: incident.detail?.recoveryTime ? `Ожидаемое восстановление: ${incident.detail.recoveryTime}` : 'Данные уровня района',
    canArchive: false,
    canResolve: false,
    liveMeta: incident,
    workflowEntries: workflow[incident.id] ?? [],
    timeline: [...incident.timeline, ...(workflow[incident.id] ?? []).map((entry) => ({ id: entry.id, at: entry.at, author: entry.author, text: entry.text }))],
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

export const selectIncidentById = (state: SigmaState, id: string): LiveIncidentView | undefined => selectIncidentViewList(state).find((incident) => incident.id === id)

export const selectOutageHistorySeries = (state: SigmaState) => {
  const history = state.live.liveHistory
  if (history.length === 0) return []
  return history.map((snapshot) => ({
    label: new Date(snapshot.snapshotAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
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

export const useIncidentViews = (): LiveIncidentView[] => {
  const incidents = useSigmaStore((state) => state.incidents)
  const live = useSigmaStore((state) => state.live)
  return useMemo(() => selectIncidentViewList({ ...useSigmaStore.getState(), incidents, live }), [incidents, live])
}

export const useConstructionAggregates = () => {
  const construction = useSigmaStore((state) => state.live.construction)
  return useMemo(() => construction?.payload.aggregates ?? [], [construction])
}

export const useDistrictOutageCards = () => {
  const outages = useSigmaStore((state) => state.live.outages)
  return useMemo(() => {
    const topDistricts = outages?.payload.summary.topDistricts ?? []
    return topDistricts.map((item) => ({ ...item, districtName: getDistrictName(item.districtId ?? item.district) }))
  }, [outages])
}

export const useOutageHistorySeries = () => {
  const history = useSigmaStore((state) => state.live.liveHistory)
  return useMemo(() => history.map((snapshot) => ({
    label: new Date(snapshot.snapshotAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    planned: snapshot.totals.planned,
    emergency: snapshot.totals.emergency,
    total: snapshot.totals.houses,
  })), [history])
}

export const selectIndicators = (state: SigmaState) => state.live.indicators
export const selectReferenceObjects = (state: SigmaState) => state.live.referenceObjects
export const selectRiskCards = (state: SigmaState) => state.live.riskCards
export const selectTrafficIndex = (state: SigmaState) => state.live.trafficIndex
export const selectDistrictBoundaries = (state: SigmaState) => state.live.districtBoundaries
export const selectConstructionObjects = (state: SigmaState) => state.live.constructionObjects
export const selectTransitRoutes = (state: SigmaState) => state.live.transitRoutes

export const useIndicators = () => useSigmaStore(selectIndicators)
export const useReferenceObjects = () => useSigmaStore(selectReferenceObjects)
export const useRiskCards = () => useSigmaStore(selectRiskCards)
export const useTrafficIndex = () => useSigmaStore(selectTrafficIndex)
export const useConstructionObjects = () => useSigmaStore(selectConstructionObjects)
export const useTransitRoutes = () => useSigmaStore(selectTransitRoutes)
