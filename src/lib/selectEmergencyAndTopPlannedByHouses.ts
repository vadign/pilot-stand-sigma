import type { Incident } from '../types'

type WithLiveHouseMeta = Incident & {
  detail?: {
    houses?: number
  }
  liveMeta?: {
    outageKind?: string
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

const getOutageKind = (incident: WithLiveHouseMeta): string | undefined => incident.liveMeta?.outageKind

const getHouseRank = (incident: WithLiveHouseMeta): number => {
  const houses = getHouseCount(incident)
  return typeof houses === 'number' && Number.isFinite(houses) ? houses : -1
}

export const selectEmergencyAndTopPlannedByHouses = <T extends Incident>(incidents: T[], plannedLimit: number): T[] => {
  const typedIncidents = incidents as Array<T & WithLiveHouseMeta>
  const hasOutageKinds = typedIncidents.some((incident) => {
    const outageKind = getOutageKind(incident)
    return outageKind === 'emergency' || outageKind === 'planned'
  })

  if (!hasOutageKinds) return incidents

  const selectedPlannedIndexes = new Set(
    typedIncidents
      .map((incident, index) => ({ index, outageKind: getOutageKind(incident), houseRank: getHouseRank(incident) }))
      .filter((item) => item.outageKind === 'planned')
      .sort((left, right) => right.houseRank - left.houseRank || left.index - right.index)
      .slice(0, Math.max(0, plannedLimit))
      .map((item) => item.index),
  )

  return incidents.filter((incident, index) => {
    const outageKind = getOutageKind(incident as T & WithLiveHouseMeta)

    if (outageKind === 'emergency') return true
    if (outageKind === 'planned') return selectedPlannedIndexes.has(index)
    return true
  })
}
