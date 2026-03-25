import type { Incident } from '../types'

type WithLiveHouseMeta = Incident & {
  detail?: {
    houses?: number
  }
  liveMeta?: {
    detail?: {
      houses?: number
    }
    raw?: {
      houses?: number
    }
  }
}

const getHouseCount = (incident: WithLiveHouseMeta): number | undefined =>
  incident.liveMeta?.raw?.houses
  ?? incident.liveMeta?.detail?.houses
  ?? incident.detail?.houses

export const selectTopIncidentsByHouses = <T extends Incident>(incidents: T[], limit: number): T[] => {
  if (limit <= 0) return []

  const ranked = incidents
    .map((incident, index) => ({ incident, index, houses: getHouseCount(incident as T & WithLiveHouseMeta) }))
    .filter((item) => typeof item.houses === 'number' && Number.isFinite(item.houses) && item.houses > 0)

  if (ranked.length === 0) return incidents

  return ranked
    .sort((left, right) => (right.houses ?? 0) - (left.houses ?? 0) || left.index - right.index)
    .slice(0, limit)
    .map((item) => item.incident)
}
