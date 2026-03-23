import type { DistrictTransportMetrics, TransitMode, TransitStop } from '../types'

const emptyModes = (): Record<TransitMode, number> => ({
  bus: 0,
  trolleybus: 0,
  tram: 0,
  minibus: 0,
  metro: 0,
  unknown: 0,
})

export const buildDistrictMetrics = (stops: TransitStop[], district: string): DistrictTransportMetrics => {
  const scopedStops = stops.filter((stop) => stop.district === district)
  const routeSet = new Set(scopedStops.flatMap((stop) => stop.routesParsed.map((route) => route.id)))
  const routesByMode = emptyModes()

  for (const route of scopedStops.flatMap((stop) => stop.routesParsed)) {
    routesByMode[route.mode] += 1
  }

  const pavilionShare = scopedStops.length === 0 ? 0 : scopedStops.filter((stop) => stop.hasPavilion).length / scopedStops.length
  const richestStop = [...scopedStops].sort((left, right) => right.routesParsed.length - left.routesParsed.length)[0]
  const infrastructureIndex = Number((scopedStops.length * 0.4 + routeSet.size * 0.4 + pavilionShare * 100 * 0.2).toFixed(1))

  return {
    district,
    stopCount: scopedStops.length,
    uniqueRoutes: routeSet.size,
    pavilionShare,
    richestStop,
    routesByMode,
    transportInfrastructureIndex: infrastructureIndex,
  }
}
