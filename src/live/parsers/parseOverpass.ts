import type { SigmaReferenceObject } from '../types'

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassPayload {
  elements: OverpassElement[]
}

export const parseOverpassObjects = (
  payload: OverpassPayload,
  sourceId: string,
  category: SigmaReferenceObject['category'],
  districtId: string,
  updatedAt: string,
): SigmaReferenceObject[] => payload.elements.flatMap((element, index) => {
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (typeof lat !== 'number' || typeof lon !== 'number') return []
  return [{
    id: `${sourceId}-${element.id ?? index}`,
    sourceId,
    direction: category === 'camera' ? 'safety' : 'medical',
    category,
    title: element.tags?.name || element.tags?.amenity || element.tags?.highway || `OSM объект ${index + 1}`,
    coordinates: [lat, lon],
    districtId,
    metadata: element.tags,
    dataType: 'real',
    updatedAt,
  } satisfies SigmaReferenceObject]
})
