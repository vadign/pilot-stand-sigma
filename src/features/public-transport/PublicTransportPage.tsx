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
import { getTransportDistrictLabel, selectCurrentFareCards, selectDistrictConnectivity, selectFilteredStops, selectGlobalTransportMetrics, selectRouteDetails, selectSelectedDistrictSummary, selectStopsForRoute, selectTransportFilterOptions } from './selectors'
import type { LiveTransportRoute, PublicTransportBundle, PublicTransportFiltersValue, TransitMode, TransitStop } from './types'

const defaultFilters: PublicTransportFiltersValue = { district: '', mode: 'minibus', search: '', route: '35', onlyPavilion: false }
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
  const [liveRoutesError, setLiveRoutesError] = useState<string | null>(null)

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
        setLiveRoutesError(null)
      } catch (error) {
        if (cancelled) return
        setLiveRoutes([])
        setLiveRoutesError(error instanceof Error ? error.message : 'Не удалось загрузить /api/routes')
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
  const realtimeNotice = liveRoutesError
    ? `Realtime proxy недоступен: ${liveRoutesError}`
    : !filters.route
      ? 'Чтобы показать реальные машины на карте, выберите номер маршрута. Карта будет запрашивать `/api/vehicles?routeId=...` только для совпавших routeId.'
      : liveRouteMatches.length > 0
        ? `Показываю реальные машины для ${liveRouteMatches.length} routeId из maps.nskgortrans.ru через backend-proxy.`
        : 'Для выбранного номера маршрута нет совпадений в live-списке `/api/routes`. Уточните номер или тип транспорта.'

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
      <TransportFilters filters={filters} districts={filterOptions.districts} routeSuggestions={routeSuggestions} onChange={handleFiltersChange} onReset={() => handleFiltersChange(defaultFilters)} />

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
                    {filters.route ? `Фокус на маршруте № ${filters.route}` : filters.district ? `Фокус на районе ${filters.district}` : 'Весь город'}
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
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-1">Подложка: Yandex transit</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Красная точка: вручную выбранная остановка</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Реальные машины грузятся только после выбора маршрута</span>
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  {realtimeNotice}
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Список остановок</div>
                    <div className="text-2xl font-bold">Отфильтрованные остановки</div>
                  </div>
                  <div className="text-sm text-slate-500">Всего строк: {filteredStops.length}</div>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-2 py-2">Остановка</th>
                        <th className="px-2 py-2">Район</th>
                        <th className="px-2 py-2">Улица</th>
                        <th className="px-2 py-2">Павильон</th>
                        <th className="px-2 py-2">Маршруты</th>
                        <th className="px-2 py-2">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStops.map((stop) => (
                        <tr key={stop.id} className="border-b border-slate-100 align-top">
                          <td className="px-2 py-3 font-semibold text-slate-900">{stop.name}</td>
                          <td className="px-2 py-3">{getTransportDistrictLabel(stop.district)}</td>
                          <td className="px-2 py-3 text-slate-600">{stop.street || '—'}</td>
                          <td className="px-2 py-3">{stop.hasPavilion ? 'Да' : 'Нет'}</td>
                          <td className="px-2 py-3">
                            <div className="max-h-20 overflow-auto text-slate-600">{stop.routesParsed.map((route) => route.number).join(', ') || '—'}</div>
                          </td>
                          <td className="px-2 py-3"><button onClick={() => setSelectedStop(stop)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50">Показать на карте</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <TransportMetrics
                totalStops={globalMetrics.totalStops}
                totalUniqueRoutes={globalMetrics.totalUniqueRoutes}
                pavilionShare={globalMetrics.pavilionShare}
                districtCount={globalMetrics.districtCount}
                infrastructureIndex={globalMetrics.transportInfrastructureIndex}
                topStopsByRouteCount={globalMetrics.topStopsByRouteCount}
                topDistrictsByStopCount={globalMetrics.topDistrictsByStopCount}
                topDistrictsByUniqueRoutes={globalMetrics.topDistrictsByUniqueRoutes}
                selectedDistrict={selectedDistrict}
                statuses={bundle.statuses}
                realtime={bundle.realtime}
              />
              <StopDetailsDrawer stop={selectedStop} relatedHubs={relatedHubs} />
              <RouteDetailsPanel route={selectedRoute} />
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
          </div>

          <FareCards fares={fareCards} />
        </div>
      )}
    </div>
  )
}
