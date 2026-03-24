import { getDistrictName } from '../../lib/districts'
import { buildDistrictMetrics } from './utils/buildDistrictMetrics'
import { buildRouteMetrics } from './utils/buildRouteMetrics'
import type { DistrictTransportMetrics, PublicTransportFiltersValue, TransportFare, TransportRouteMetrics, TransitMode, TransitStop } from './types'

const emptyModes = (): Record<TransitMode, number> => ({
  bus: 0,
  trolleybus: 0,
  tram: 0,
  minibus: 0,
  metro: 0,
  unknown: 0,
})

const normalize = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е')

export const getTransportDistrictLabel = (district: string): string => getDistrictName(district) || district

export const selectTransportFilterOptions = (stops: TransitStop[]) => ({
  districts: Array.from(new Set(stops.map((stop) => stop.district))).filter(Boolean).sort((left, right) => left.localeCompare(right, 'ru')),
  routes: Array.from(new Set(stops.flatMap((stop) => stop.routesParsed.map((route) => route.number)))).sort((left, right) => left.localeCompare(right, 'ru', { numeric: true })),
})

export const selectFilteredStops = (stops: TransitStop[], filters: PublicTransportFiltersValue): TransitStop[] => {
  const search = normalize(filters.search)
  const route = normalize(filters.route)

  return stops.filter((stop) => {
    if (filters.district && stop.district !== filters.district) return false
    if (filters.mode !== 'all' && !stop.routesParsed.some((item) => item.mode === filters.mode)) return false
    if (filters.onlyPavilion && !stop.hasPavilion) return false
    if (search && !normalize(`${stop.name} ${stop.street}`).includes(search)) return false
    if (route && !stop.routesParsed.some((item) => normalize(item.number) === route)) return false
    return true
  })
}

export const selectGlobalTransportMetrics = (stops: TransitStop[], fares: TransportFare[]) => {
  const uniqueRoutes = new Map<string, TransitMode>()
  const districtStopCounts = Array.from(new Set(stops.map((stop) => stop.district))).map((district) => ({
    district,
    districtName: getTransportDistrictLabel(district),
    stopCount: stops.filter((stop) => stop.district === district).length,
  })).sort((left, right) => right.stopCount - left.stopCount)

  const routesByMode = emptyModes()
  for (const route of stops.flatMap((stop) => stop.routesParsed)) {
    uniqueRoutes.set(route.id, route.mode)
  }
  for (const mode of uniqueRoutes.values()) routesByMode[mode] += 1

  const pavilionShare = stops.length === 0 ? 0 : stops.filter((stop) => stop.hasPavilion).length / stops.length
  const topStopsByRouteCount = [...stops].sort((left, right) => right.routesParsed.length - left.routesParsed.length).slice(0, 10)
  const topDistrictsByStopCount = districtStopCounts.slice(0, 5)
  const topDistrictsByUniqueRoutes = districtStopCounts
    .map((item) => ({
      district: item.district,
      districtName: item.districtName,
      uniqueRoutes: new Set(stops.filter((stop) => stop.district === item.district).flatMap((stop) => stop.routesParsed.map((route) => route.id))).size,
    }))
    .sort((left, right) => right.uniqueRoutes - left.uniqueRoutes)
    .slice(0, 5)

  const routeCoverageByDistrict = Array.from(uniqueRoutes.entries()).reduce<Record<string, string[]>>((acc, [routeId]) => {
    const [mode, number] = routeId.split(':')
    const districts = Array.from(new Set(stops.filter((stop) => stop.routesParsed.some((route) => route.id === routeId)).map((stop) => stop.district)))
    acc[number] = districts.map(getTransportDistrictLabel)
    acc[`${mode}:${number}`] = districts
    return acc
  }, {})

  const infrastructureIndex = Number((stops.length * 0.4 + uniqueRoutes.size * 0.4 + pavilionShare * 100 * 0.2).toFixed(1))
  return {
    totalStops: stops.length,
    districtStopCounts,
    districtCount: districtStopCounts.length,
    totalUniqueRoutes: uniqueRoutes.size,
    routesByMode,
    pavilionShare,
    topStopsByRouteCount,
    topDistrictsByStopCount,
    topDistrictsByUniqueRoutes,
    routeCoverageByDistrict,
    currentFareCards: selectCurrentFareCards(fares),
    transportInfrastructureIndex: infrastructureIndex,
  }
}

export const selectSelectedDistrictSummary = (stops: TransitStop[], district: string): DistrictTransportMetrics | undefined => {
  if (!district) return undefined
  return buildDistrictMetrics(stops, district)
}

export const selectRouteMetrics = (stops: TransitStop[]): TransportRouteMetrics[] => buildRouteMetrics(stops)

export const selectRouteDetails = (stops: TransitStop[], routeNumber: string): TransportRouteMetrics | undefined => {
  if (!routeNumber) return undefined
  return selectRouteMetrics(stops).find((route) => route.routeId === routeNumber)
}

export const selectCurrentFareCards = (fares: TransportFare[]) => {
  return fares
    .filter((fare) => fare.mode !== 'unknown')
    .sort((left, right) => left.amount - right.amount)
}

export const selectDistrictConnectivity = (stops: TransitStop[], districtA: string, districtB: string) => {
  if (!districtA || !districtB) return { commonRoutes: [], count: 0, examplesA: [], examplesB: [] as TransitStop[] }

  const leftStops = stops.filter((stop) => stop.district === districtA)
  const rightStops = stops.filter((stop) => stop.district === districtB)
  const leftRoutes = new Set(leftStops.flatMap((stop) => stop.routesParsed.map((route) => route.number)))
  const rightRoutes = new Set(rightStops.flatMap((stop) => stop.routesParsed.map((route) => route.number)))
  const commonRoutes = Array.from(leftRoutes).filter((route) => rightRoutes.has(route)).sort((left, right) => left.localeCompare(right, 'ru', { numeric: true }))

  return {
    commonRoutes,
    count: commonRoutes.length,
    examplesA: [...leftStops].sort((left, right) => right.routesParsed.length - left.routesParsed.length).slice(0, 3),
    examplesB: [...rightStops].sort((left, right) => right.routesParsed.length - left.routesParsed.length).slice(0, 3),
  }
}

export const selectStopsForRoute = (stops: TransitStop[], routeNumber: string): TransitStop[] =>
  stops.filter((stop) => stop.routesParsed.some((route) => route.number === routeNumber))
