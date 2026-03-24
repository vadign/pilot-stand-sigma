import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, SectionTitle } from '../../components/ui'
import { useSigmaStore } from '../../store/useSigmaStore'
import { FareCards } from './components/FareCards'
import { RouteDetailsPanel } from './components/RouteDetailsPanel'
import { StopDetailsDrawer } from './components/StopDetailsDrawer'
import { TransportFilters } from './components/TransportFilters'
import { TransportMap } from './components/TransportMap'
import { TransportMetrics } from './components/TransportMetrics'
import { NovosibirskStopsProvider } from './providers/NovosibirskStopsProvider'
import { NovosibirskTariffsProvider } from './providers/NovosibirskTariffsProvider'
import { TransportRealtimeProvider } from './providers/TransportRealtimeProvider'
import { selectCurrentFareCards, selectDistrictConnectivity, selectFilteredStops, selectGlobalTransportMetrics, selectRouteDetails, selectSelectedDistrictSummary, selectStopsForRoute, selectTransportFilterOptions } from './selectors'
import type { LiveTransportRoute, PublicTransportBundle, PublicTransportFiltersValue, TransitMode, TransitStop } from './types'

const defaultFilters: PublicTransportFiltersValue = { district: '', mode: 'all', search: '', route: '', onlyPavilion: false }
const transportFilterParamKeys = ['district', 'mode', 'search', 'route', 'pavilion', 'pavilionOnly', 'fromDistrict', 'toDistrict', 'focus'] as const
const stopsProvider = new NovosibirskStopsProvider()
const tariffsProvider = new NovosibirskTariffsProvider()
const realtimeProvider = new TransportRealtimeProvider()

const normalize = (value: string) => value.trim().toLowerCase().replace(/ё/g, 'е')
const transportModeByRouteType = (type: number): TransitMode => {
  if (type === 1) return 'trolleybus'
  if (type === 2) return 'tram'
  if (type === 7) return 'minibus'
  return 'bus'
}

const transportLabelByRouteType = (type: number): string => {
  if (type === 1) return 'Троллейбус'
  if (type === 2) return 'Трамвай'
  if (type === 7) return 'Маршрутка'
  return 'Автобус'
}

const readFiltersFromParams = (params: URLSearchParams, withDefaults = false): PublicTransportFiltersValue => ({
  district: params.get('district') ?? (withDefaults ? defaultFilters.district : ''),
  mode: (params.get('mode') as PublicTransportFiltersValue['mode']) || (withDefaults ? defaultFilters.mode : 'all'),
  search: params.get('search') ?? (withDefaults ? defaultFilters.search : ''),
  route: params.get('route') ?? (withDefaults ? defaultFilters.route : ''),
  onlyPavilion: params.get('pavilion') === '1' || params.get('pavilionOnly') === 'true',
})

const readConnectivityFromParams = (params: URLSearchParams) => ({
  from: params.get('fromDistrict') ?? params.get('district') ?? '',
  to: params.get('toDistrict') ?? params.get('compareTo') ?? '',
})

const writeFiltersToParams = (filters: PublicTransportFiltersValue, currentParams: URLSearchParams): URLSearchParams => {
  const params = new URLSearchParams(currentParams)
  transportFilterParamKeys.forEach((key) => params.delete(key))
  if (filters.district) params.set('district', filters.district)
  if (filters.mode !== 'all') params.set('mode', filters.mode)
  if (filters.search) params.set('search', filters.search)
  if (filters.route) params.set('route', filters.route)
  if (filters.onlyPavilion) { params.set('pavilion', '1'); params.set('pavilionOnly', 'true') }
  return params
}

export const PublicTransportPage = ({ embedded = false }: { embedded?: boolean }) => {
  const sourceMode = useSigmaStore((state) => state.sourceMode)
  const [searchParams, setSearchParams] = useSearchParams()
  const isFirstParamsSync = useRef(true)
  const [filters, setFilters] = useState<PublicTransportFiltersValue>(() => readFiltersFromParams(searchParams, true))
  const [bundle, setBundle] = useState<PublicTransportBundle>()
  const [loading, setLoading] = useState(true)
  const [selectedStop, setSelectedStop] = useState<TransitStop>()
  const [connectivity, setConnectivity] = useState(() => readConnectivityFromParams(searchParams))
  const [liveRoutes, setLiveRoutes] = useState<LiveTransportRoute[]>([])

  useEffect(() => {
    if (isFirstParamsSync.current) {
      isFirstParamsSync.current = false
      return
    }

    setFilters(readFiltersFromParams(searchParams))
    setConnectivity(readConnectivityFromParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([stopsProvider.load(sourceMode), tariffsProvider.load(sourceMode)]).then(([stopsResult, faresResult]) => {
      if (cancelled) return
      setBundle({
        mode: sourceMode,
        stops: stopsResult.stops,
        fares: faresResult.fares,
        statuses: [stopsResult.status, faresResult.status],
        realtime: realtimeProvider.getAvailability(),
      })
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sourceMode])

  useEffect(() => {
    let cancelled = false

    const loadLiveRoutes = async () => {
      try {
        const response = await fetch('/api/routes', { cache: 'no-store' })
        if (!response.ok) throw new Error(`routes feed failed: ${response.status}`)
        const routes = await response.json() as LiveTransportRoute[]
        if (cancelled) return
        setLiveRoutes(routes)
      } catch (error) {
        if (cancelled) return
        setLiveRoutes([])
      }
    }

    void loadLiveRoutes()

    return () => {
      cancelled = true
    }
  }, [])

  const filterOptions = useMemo(() => selectTransportFilterOptions(bundle?.stops ?? []), [bundle?.stops])
  const filteredStops = useMemo(() => selectFilteredStops(bundle?.stops ?? [], filters), [bundle?.stops, filters])
  const globalMetrics = useMemo(() => selectGlobalTransportMetrics(bundle?.stops ?? [], bundle?.fares ?? []), [bundle?.fares, bundle?.stops])
  const selectedDistrict = useMemo(() => selectSelectedDistrictSummary(bundle?.stops ?? [], filters.district), [bundle?.stops, filters.district])
  const selectedRoute = useMemo(() => selectRouteDetails(bundle?.stops ?? [], filters.route), [bundle?.stops, filters.route])
  const relatedHubs = useMemo(() => {
    if (!selectedStop) return []
    return globalMetrics.topStopsByRouteCount.filter((stop) => stop.id !== selectedStop.id).slice(0, 3)
  }, [globalMetrics.topStopsByRouteCount, selectedStop])
  const districtConnectivity = useMemo(() => selectDistrictConnectivity(bundle?.stops ?? [], connectivity.from, connectivity.to), [bundle?.stops, connectivity])
  const stopsForSelectedRoute = useMemo(() => selectStopsForRoute(bundle?.stops ?? [], filters.route), [bundle?.stops, filters.route])
  const visibleStopsForMap = filters.route ? stopsForSelectedRoute : filteredStops
  const fareCards = useMemo(() => selectCurrentFareCards(bundle?.fares ?? []), [bundle?.fares])
  const liveRouteMatches = useMemo(() =>
    !filters.route
      ? []
      : liveRoutes.filter((route) =>
        normalize(route.number) === normalize(filters.route)
        && (filters.mode === 'all' || transportModeByRouteType(route.type) === filters.mode),
      )
  , [filters.mode, filters.route, liveRoutes])
  const routeSuggestions = useMemo(() =>
    liveRoutes.map((route) => ({
      key: route.routeId,
      value: route.number,
      mode: transportModeByRouteType(route.type),
      label: `${transportLabelByRouteType(route.type)} ${route.number}: ${route.stopA} → ${route.stopB}`,
      searchValue: `${transportLabelByRouteType(route.type)} ${route.number}: ${route.stopA} → ${route.stopB}`,
    }))
  , [liveRoutes])

  useEffect(() => {
    if (selectedStop && !filteredStops.some((stop) => stop.id === selectedStop.id)) {
      setSelectedStop(undefined)
    }
  }, [filteredStops, selectedStop])

  const handleFiltersChange = (next: PublicTransportFiltersValue) => {
    setFilters(next)
    setSearchParams(writeFiltersToParams(next, searchParams), { replace: true })
  }

  return (
    <div className="space-y-4">
      {!embedded && <SectionTitle title="Общественный транспорт" subtitle="Остановки и тарифы из официальных открытых наборов Новосибирска без симуляции live GPS." />}
      <TransportFilters
        filters={filters}
        districts={filterOptions.districts}
        routeSuggestions={routeSuggestions}
        onChange={handleFiltersChange}
        showDistrictFilter={!embedded}
      />

      {loading && <Card>Загружаю транспортные данные…</Card>}

      {!loading && bundle && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-4">
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Яндекс.Карта</div>
                    <div className="text-2xl font-bold">Карта общественного транспорта</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {filters.route ? `Сейчас на карте: маршрут № ${filters.route}` : filters.district ? `Сейчас на карте: район ${filters.district}` : 'Сейчас на карте: весь город'}
                  </div>
                </div>
                <TransportMap
                  stops={visibleStopsForMap}
                  selectedStop={selectedStop}
                  selectedDistrict={filters.district}
                  selectedRoute={filters.route}
                  liveRoutes={liveRouteMatches}
                  onSelectStop={setSelectedStop}
                />
              </Card>

              <Card>
                <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Связность районов</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select value={connectivity.from} onChange={(event) => {
                    const from = event.target.value
                    setConnectivity((current) => ({ ...current, from }))
                    const params = new URLSearchParams(searchParams)
                    if (from) params.set('fromDistrict', from)
                    else params.delete('fromDistrict')
                    setSearchParams(params, { replace: true })
                  }} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="">Район отправления</option>
                    {filterOptions.districts.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                  <select value={connectivity.to} onChange={(event) => {
                    const to = event.target.value
                    setConnectivity((current) => ({ ...current, to }))
                    const params = new URLSearchParams(searchParams)
                    if (to) params.set('toDistrict', to)
                    else params.delete('toDistrict')
                    setSearchParams(params, { replace: true })
                  }} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="">Район назначения</option>
                    {filterOptions.districts.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl border border-slate-200 p-3">Общих маршрутов: <span className="font-semibold">{districtConnectivity.count}</span></div>
                  <div className="rounded-xl border border-slate-200 p-3">Номера: {districtConnectivity.commonRoutes.join(', ') || 'нет пересечений'}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">Примеры в A: {districtConnectivity.examplesA.map((stop) => stop.name).join(', ') || '—'}</div>
                    <div className="rounded-xl border border-slate-200 p-3">Примеры в B: {districtConnectivity.examplesB.map((stop) => stop.name).join(', ') || '—'}</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <TransportMetrics
                totalStops={globalMetrics.totalStops}
                totalUniqueRoutes={globalMetrics.totalUniqueRoutes}
                pavilionShare={globalMetrics.pavilionShare}
                districtCount={globalMetrics.districtCount}
                topStopsByRouteCount={globalMetrics.topStopsByRouteCount}
                topDistrictsByStopCount={globalMetrics.topDistrictsByStopCount}
                topDistrictsByUniqueRoutes={globalMetrics.topDistrictsByUniqueRoutes}
                selectedDistrict={selectedDistrict}
              />
              <StopDetailsDrawer stop={selectedStop} relatedHubs={relatedHubs} />
              <RouteDetailsPanel route={selectedRoute} />
            </div>
          </div>

          <FareCards fares={fareCards} />
        </div>
      )}
    </div>
  )
}
