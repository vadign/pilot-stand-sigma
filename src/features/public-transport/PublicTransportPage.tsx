import { useEffect, useMemo, useState } from 'react'
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
import type { PublicTransportBundle, PublicTransportFiltersValue, TransitStop } from './types'

const defaultFilters: PublicTransportFiltersValue = { district: '', mode: 'all', search: '', route: '', onlyPavilion: false }
const stopsProvider = new NovosibirskStopsProvider()
const tariffsProvider = new NovosibirskTariffsProvider()
const realtimeProvider = new TransportRealtimeProvider()

const readFiltersFromParams = (params: URLSearchParams): PublicTransportFiltersValue => ({
  district: params.get('district') ?? '',
  mode: (params.get('mode') as PublicTransportFiltersValue['mode']) || 'all',
  search: params.get('search') ?? '',
  route: params.get('route') ?? '',
  onlyPavilion: params.get('pavilion') === '1',
})

const writeFiltersToParams = (filters: PublicTransportFiltersValue): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters.district) params.set('district', filters.district)
  if (filters.mode !== 'all') params.set('mode', filters.mode)
  if (filters.search) params.set('search', filters.search)
  if (filters.route) params.set('route', filters.route)
  if (filters.onlyPavilion) params.set('pavilion', '1')
  return params
}

export const PublicTransportPage = () => {
  const sourceMode = useSigmaStore((state) => state.sourceMode)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<PublicTransportFiltersValue>(() => readFiltersFromParams(searchParams))
  const [bundle, setBundle] = useState<PublicTransportBundle>()
  const [loading, setLoading] = useState(true)
  const [selectedStop, setSelectedStop] = useState<TransitStop>()
  const [connectivity, setConnectivity] = useState({ from: '', to: '' })

  useEffect(() => {
    setFilters(readFiltersFromParams(searchParams))
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

  const handleFiltersChange = (next: PublicTransportFiltersValue) => {
    setFilters(next)
    setSearchParams(writeFiltersToParams(next), { replace: true })
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Общественный транспорт" subtitle="Остановки и тарифы из официальных открытых наборов Новосибирска без симуляции live GPS." />
      <TransportFilters filters={filters} districts={filterOptions.districts} onChange={handleFiltersChange} onReset={() => handleFiltersChange(defaultFilters)} />

      {loading && <Card>Загружаю транспортные данные…</Card>}

      {!loading && bundle && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-4">
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Яндекс.Карта</div>
                    <div className="text-2xl font-bold">Слой остановок общественного транспорта</div>
                  </div>
                  <div className="text-sm text-slate-500">Текущий набор на карте: {visibleStopsForMap.length}</div>
                </div>
                <TransportMap stops={visibleStopsForMap} selectedStop={selectedStop} selectedDistrict={filters.district} selectedRoute={filters.route} onSelectStop={setSelectedStop} />
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-1">Синий: остановка</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Зелёный: остановка выбранного маршрута</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Красный: выбранная остановка</span>
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
                  <select value={connectivity.from} onChange={(event) => setConnectivity((current) => ({ ...current, from: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="">Район отправления</option>
                    {filterOptions.districts.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                  <select value={connectivity.to} onChange={(event) => setConnectivity((current) => ({ ...current, to: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2">
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
