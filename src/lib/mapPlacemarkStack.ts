type WithCoordinates = {
  id: string
  coordinates: [number, number]
}

type CollisionBucket = {
  anchor: [number, number]
  count: number
}

type CollisionBucketWithItems<T> = CollisionBucket & {
  items: T[]
}

type WithIncidentPriority = WithCoordinates & {
  severity?: string
  affectedPopulation?: number
  detectedAt?: string
  liveMeta?: {
    outageKind?: string
  } | null
}

const STACK_GAP_PX = 34

const getCollisionConfig = (zoom: number) => {
  if (zoom >= 13) return { latThreshold: 0.0022, lngThreshold: 0.0032, latStep: 0.0015 }
  if (zoom === 12) return { latThreshold: 0.0035, lngThreshold: 0.005, latStep: 0.0022 }
  return { latThreshold: 0.0055, lngThreshold: 0.008, latStep: 0.003 }
}

const bucketNearbyPlacemarks = <T extends WithCoordinates>(
  items: T[],
  zoom: number,
): CollisionBucketWithItems<T>[] => {
  const { latThreshold, lngThreshold } = getCollisionConfig(zoom)
  const buckets: CollisionBucketWithItems<T>[] = []

  for (const item of items) {
    const bucket = buckets.find(({ anchor }) =>
      Math.abs(anchor[0] - item.coordinates[0]) <= latThreshold
      && Math.abs(anchor[1] - item.coordinates[1]) <= lngThreshold,
    )

    if (!bucket) {
      buckets.push({ anchor: item.coordinates, count: 1, items: [item] })
      continue
    }

    bucket.count += 1
    bucket.items.push(item)
  }

  return buckets
}

const isCriticalIncident = (item: WithIncidentPriority): boolean =>
  item.severity === 'критический' || item.liveMeta?.outageKind === 'emergency'

const isPlannedIncident = (item: WithIncidentPriority): boolean => item.liveMeta?.outageKind === 'planned'

const comparePlannedIncidents = (left: WithIncidentPriority, right: WithIncidentPriority): number => {
  const populationDelta = (right.affectedPopulation ?? 0) - (left.affectedPopulation ?? 0)
  if (populationDelta !== 0) return populationDelta

  const rightTime = new Date(right.detectedAt ?? 0).getTime()
  const leftTime = new Date(left.detectedAt ?? 0).getTime()
  return rightTime - leftTime
}

const getBucketCenter = <T extends WithCoordinates>(items: T[]): [number, number] => {
  const latitude = items.reduce((sum, item) => sum + item.coordinates[0], 0) / items.length
  const longitude = items.reduce((sum, item) => sum + item.coordinates[1], 0) / items.length
  return [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))]
}

const getStackSlot = (index: number): number => {
  if (index === 0) return 0
  const layer = Math.ceil(index / 2)
  return index % 2 === 1 ? -layer : layer
}

export const selectCriticalAndOnePlannedPerCollisionBucket = <T extends WithIncidentPriority>(
  items: T[],
  zoom: number,
): T[] => {
  return bucketNearbyPlacemarks(items, zoom).flatMap((bucket) => {
    if (bucket.items.length <= 1) return bucket.items

    const criticalItems = bucket.items.filter(isCriticalIncident)
    const plannedRepresentative = [...bucket.items]
      .filter((item) => isPlannedIncident(item) && !isCriticalIncident(item))
      .sort(comparePlannedIncidents)[0]

    if (criticalItems.length === 0 && !plannedRepresentative) return bucket.items

    const allowedIds = new Set([
      ...criticalItems.map((item) => item.id),
      ...(plannedRepresentative ? [plannedRepresentative.id] : []),
    ])

    return bucket.items.filter((item) => allowedIds.has(item.id))
  })
}

export const stackNearbyPlacemarks = <T extends WithCoordinates>(
  items: T[],
  zoom: number,
): Array<T & { displayCoordinates: [number, number]; displayOffset: [number, number] }> => {
  return bucketNearbyPlacemarks(items, zoom).flatMap((bucket) =>
    bucket.items.map((item, index) => ({
      ...item,
      displayCoordinates: getBucketCenter(bucket.items),
      displayOffset: [0, getStackSlot(index) * STACK_GAP_PX] as [number, number],
    }))
  )
}
