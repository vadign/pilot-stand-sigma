import { useMemo, useState } from 'react'
import { Card, CollapsibleCardSection, SectionTitle } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useSigmaStore } from '../../store/useSigmaStore'
import { RouteDetailsPanel } from './components/RouteDetailsPanel'
import { StopDetailsDrawer } from './components/StopDetailsDrawer'
import { TransportFilters } from './components/TransportFilters'
import { TransportMap } from './components/TransportMap'
import { TransportMetrics } from './components/TransportMetrics'
import { useLiveTransportRoutes } from './hooks/useLiveTransportRoutes'
import { useRouteVehicles } from './hooks/useRouteVehicles'
import { useTransportData } from './hooks/useTransportData'
import { useTransportQueryState } from './hooks/useTransportQueryState'
import {
  normalizeTransportText,
  transportLabelByRouteType,
  transportModeByRouteType,
} from './queryState'
import {
  selectCurrentFareCards,
  getTransportDistrictLabel,
  selectDistrictConnectivity,
  selectFilteredStops,
  selectGlobalTransportMetrics,
  selectRouteDetails,
  selectSelectedDistrictSummary,
  selectStopsForRoute,
  selectTransportFilterOptions,
} from './selectors'
import type { TransitStop } from './types'

export const PublicTransportPage = ({ embedded = false }: { embedded?: boolean }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const sourceMode = useSigmaStore((state) => state.sourceMode)
  const { filters, updateFilters, connectivity, updateConnectivity, searchParams } = useTransportQueryState()
  const { bundle, loading } = useTransportData(sourceMode)
  const liveRoutes = useLiveTransportRoutes()
  const [selectedStop, setSelectedStop] = useState<TransitStop>()

  const filterOptions = useMemo(
    () => selectTransportFilterOptions(bundle?.stops ?? []),
    [bundle?.stops],
  )
  const filteredStops = useMemo(
    () => selectFilteredStops(bundle?.stops ?? [], filters),
    [bundle?.stops, filters],
  )
  const globalMetrics = useMemo(
    () => selectGlobalTransportMetrics(bundle?.stops ?? [], bundle?.fares ?? []),
    [bundle?.fares, bundle?.stops],
  )
  const selectedDistrict = useMemo(
    () => selectSelectedDistrictSummary(bundle?.stops ?? [], filters.district),
    [bundle?.stops, filters.district],
  )
  const selectedRoute = useMemo(
    () => selectRouteDetails(bundle?.stops ?? [], filters.route),
    [bundle?.stops, filters.route],
  )
  const activeSelectedStop =
    selectedStop && filteredStops.some((stop) => stop.id === selectedStop.id)
      ? selectedStop
      : undefined
  const relatedHubs = useMemo(() => {
    if (!activeSelectedStop) return []
    return globalMetrics.topStopsByRouteCount
      .filter((stop) => stop.id !== activeSelectedStop.id)
      .slice(0, 3)
  }, [activeSelectedStop, globalMetrics.topStopsByRouteCount])
  const districtConnectivity = useMemo(
    () => selectDistrictConnectivity(bundle?.stops ?? [], connectivity.from, connectivity.to),
    [bundle?.stops, connectivity],
  )
  const stopsForSelectedRoute = useMemo(
    () => selectStopsForRoute(bundle?.stops ?? [], filters.route),
    [bundle?.stops, filters.route],
  )
  const visibleStopsForMap = filters.route ? stopsForSelectedRoute : filteredStops
  const liveRouteMatches = useMemo(
    () =>
      !filters.route
        ? []
        : liveRoutes.filter(
            (route) =>
              normalizeTransportText(route.number) === normalizeTransportText(filters.route) &&
              (filters.mode === 'all' || transportModeByRouteType(route.type) === filters.mode),
          ),
    [filters.mode, filters.route, liveRoutes],
  )
  const vehicles = useRouteVehicles({
    liveRoutes: liveRouteMatches,
    selectedRoute: filters.route,
  })
  const routeSuggestions = useMemo(
    () =>
      liveRoutes.map((route) => ({
        key: route.routeId,
        value: route.number,
        mode: transportModeByRouteType(route.type),
        label: `${transportLabelByRouteType(route.type)} ${route.number}: ${route.stopA} → ${route.stopB}`,
        searchValue: `${transportLabelByRouteType(route.type)} ${route.number}: ${route.stopA} → ${route.stopB}`,
      })),
    [liveRoutes],
  )
  const primaryViewSummary = filters.route
    ? `Сейчас на карте: маршрут № ${filters.route}`
    : filters.district
      ? `Сейчас на карте: район ${getTransportDistrictLabel(filters.district)}`
      : 'Сейчас на карте: весь город'
  const isEmbeddedMobile = embedded && !isDesktop
  const focus = searchParams?.get('focus') ?? 'overview'
  const networkSummary = `${globalMetrics.totalStops} остановок · ${globalMetrics.totalUniqueRoutes} маршрутов`
  const connectivitySummary = connectivity.from && connectivity.to
    ? `${districtConnectivity.count} общих маршрутов`
    : 'Выберите два района для сравнения'
  const currentFares = useMemo(
    () => selectCurrentFareCards(bundle?.fares ?? []).slice(0, 4),
    [bundle?.fares],
  )

  const connectivitySection = (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <select
          value={connectivity.from}
          onChange={(event) => updateConnectivity('from', event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">Район отправления</option>
          {filterOptions.districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <select
          value={connectivity.to}
          onChange={(event) => updateConnectivity('to', event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">Район назначения</option>
          {filterOptions.districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border border-slate-200 p-3">
          Общих маршрутов: <span className="font-semibold">{districtConnectivity.count}</span>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          Номера: {districtConnectivity.commonRoutes.join(', ') || 'нет пересечений'}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            Примеры в A: {districtConnectivity.examplesA.map((stop) => stop.name).join(', ') || '—'}
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            Примеры в B: {districtConnectivity.examplesB.map((stop) => stop.name).join(', ') || '—'}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      {!embedded && (
        <SectionTitle
          title="Общественный транспорт"
          subtitle="Остановки и маршруты из официальных открытых наборов Новосибирска без имитации координат транспорта в реальном времени."
        />
      )}
      <TransportFilters
        filters={filters}
        districts={filterOptions.districts}
        routeSuggestions={routeSuggestions}
        onChange={updateFilters}
        showDistrictFilter={!embedded}
      />

      {loading && <Card>Загружаю транспортные данные…</Card>}

      {!loading && bundle && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-4">
              <Card className={focus === 'map' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
                      Транспортный контур
                    </div>
                    <div className={isEmbeddedMobile ? 'text-xl font-bold' : 'text-2xl font-bold'}>
                      Карта общественного транспорта
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{primaryViewSummary}</div>
                </div>
                <TransportMap
                  stops={visibleStopsForMap}
                  selectedStop={activeSelectedStop}
                  selectedDistrict={filters.district}
                  selectedRoute={filters.route}
                  vehicles={vehicles}
                  onSelectStop={setSelectedStop}
                />
              </Card>

              {isEmbeddedMobile && (
                <div className={focus === 'hubs' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}>
                  <StopDetailsDrawer stop={activeSelectedStop} relatedHubs={relatedHubs} />
                </div>
              )}
              {isEmbeddedMobile && (
                <div className={focus === 'list' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}>
                  <RouteDetailsPanel route={selectedRoute} />
                </div>
              )}

              {isEmbeddedMobile ? (
                <CollapsibleCardSection
                  mobile
                  title="Связность районов"
                  summary={connectivitySummary}
                  titleClassName="text-lg font-bold"
                  contentClassName={focus === 'connectivity' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}
                >
                  {connectivitySection}
                </CollapsibleCardSection>
              ) : (
                <Card className={focus === 'connectivity' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
                  <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
                    Связность районов
                  </div>
                  {connectivitySection}
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {isEmbeddedMobile ? (
                <CollapsibleCardSection
                  mobile
                  title="Сводка сети"
                  summary={networkSummary}
                  titleClassName="text-lg font-bold"
                  contentClassName={focus === 'hubs' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}
                >
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
                </CollapsibleCardSection>
              ) : (
                <>
                  <div className={focus === 'hubs' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}>
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
                  </div>
                  <div className={focus === 'hubs' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}>
                    <StopDetailsDrawer stop={activeSelectedStop} relatedHubs={relatedHubs} />
                  </div>
                  <div className={focus === 'list' ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2' : ''}>
                    <RouteDetailsPanel route={selectedRoute} />
                  </div>
                  <Card className={focus === 'fares' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
                    <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
                      Тарифы
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      {currentFares.map((fare) => (
                        <div key={fare.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="font-semibold">{fare.fareType}</div>
                          <div className="text-slate-500">{fare.amount} ₽ · {fare.mode}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
