type WithCoordinates = {
  id: string
  coordinates: [number, number]
}

type LabelDensitySettings = {
  minZoom: number
  maxLabels: number
  latCell: number
  lngCell: number
}

const defaultLabelDensityByZoom = [
  { minZoom: 15, maxLabels: 28, latCell: 0.0018, lngCell: 0.0024 },
  { minZoom: 14, maxLabels: 20, latCell: 0.003, lngCell: 0.004 },
  { minZoom: 13, maxLabels: 12, latCell: 0.0045, lngCell: 0.006 },
  { minZoom: 12, maxLabels: 8, latCell: 0.007, lngCell: 0.009 },
] as const satisfies readonly LabelDensitySettings[]

const getDensitySettings = (
  zoom: number,
  densityByZoom: readonly LabelDensitySettings[],
): LabelDensitySettings => densityByZoom.find((item) => zoom >= item.minZoom) ?? densityByZoom[densityByZoom.length - 1]

export const selectVisibleMapLabelIds = <T extends WithCoordinates>(
  items: T[],
  zoom: number,
  options?: {
    selectedId?: string | null
    minZoom?: number
    densityByZoom?: readonly LabelDensitySettings[]
    getPriority?: (item: T) => number
  },
): Set<string> => {
  const selectedId = options?.selectedId ?? null
  const minZoom = options?.minZoom ?? 12
  const densityByZoom = options?.densityByZoom ?? defaultLabelDensityByZoom
  const forcedIds = new Set([selectedId].filter(Boolean) as string[])

  if (zoom < minZoom) return forcedIds

  const { maxLabels, latCell, lngCell } = getDensitySettings(zoom, densityByZoom)
  const visibleLabelIds = new Set<string>(forcedIds)
  const occupiedBuckets = new Set<string>()
  const prioritizedItems = [...items].sort((left, right) => {
    const leftForced = left.id === selectedId ? 1 : 0
    const rightForced = right.id === selectedId ? 1 : 0
    if (leftForced !== rightForced) return rightForced - leftForced

    const leftPriority = options?.getPriority?.(left) ?? 0
    const rightPriority = options?.getPriority?.(right) ?? 0
    if (leftPriority !== rightPriority) return rightPriority - leftPriority

    return left.id.localeCompare(right.id, 'ru')
  })

  for (const item of prioritizedItems) {
    if (!forcedIds.has(item.id) && visibleLabelIds.size >= maxLabels) break

    const bucketKey = [
      Math.floor(item.coordinates[0] / latCell),
      Math.floor(item.coordinates[1] / lngCell),
    ].join(':')

    if (!forcedIds.has(item.id) && occupiedBuckets.has(bucketKey)) continue

    visibleLabelIds.add(item.id)
    occupiedBuckets.add(bucketKey)
  }

  return visibleLabelIds
}
