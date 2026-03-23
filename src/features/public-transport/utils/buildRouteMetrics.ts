import type { TransportRouteMetrics, TransitStop } from '../types'

export const buildRouteMetrics = (stops: TransitStop[]): TransportRouteMetrics[] => {
  const routeMap = new Map<string, TransportRouteMetrics>()

  for (const stop of stops) {
    for (const route of stop.routesParsed) {
      const current = routeMap.get(route.id) ?? {
        routeId: route.number,
        mode: route.mode,
        stopCount: 0,
        districtCount: 0,
        districts: [],
        hubStops: [],
      }

      current.stopCount += 1
      current.districts = Array.from(new Set([...current.districts, stop.district])).sort((left, right) => left.localeCompare(right, 'ru'))
      current.hubStops = [...current.hubStops, stop]
        .sort((left, right) => right.routesParsed.length - left.routesParsed.length)
        .slice(0, 5)

      current.districtCount = current.districts.length
      routeMap.set(route.id, current)
    }
  }

  return Array.from(routeMap.values()).sort((left, right) => right.stopCount - left.stopCount || left.routeId.localeCompare(right.routeId, 'ru'))
}
