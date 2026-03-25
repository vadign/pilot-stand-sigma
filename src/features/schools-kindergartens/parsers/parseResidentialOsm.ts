import { normalizeDistrict } from '../utils/normalizeDistrict'
import type { ResidentialBuilding } from '../types'

type OverpassNode = { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string> }
type OverpassWay = { type: 'way'; id: number; geometry?: Array<{ lat: number; lon: number }>; tags?: Record<string, string> }
type OverpassElement = OverpassNode | OverpassWay

const centroid = (points: [number, number][]): [number, number] => {
  const lat = points.reduce((sum, item) => sum + item[0], 0) / points.length
  const lon = points.reduce((sum, item) => sum + item[1], 0) / points.length
  return [Number(lat.toFixed(6)), Number(lon.toFixed(6))]
}

export const parseResidentialOsm = (payload: { elements: OverpassElement[] }, updatedAt: string): ResidentialBuilding[] => {
  const result: ResidentialBuilding[] = []
  for (const item of payload.elements) {
    if (item.type === 'node') {
      result.push({
        id: `node-${item.id}`,
        district: normalizeDistrict(item.tags?.district),
        address: item.tags?.['addr:street'] ? `${item.tags['addr:street']} ${item.tags['addr:housenumber'] ?? ''}`.trim() : null,
        geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
        centroid: [item.lat, item.lon],
        source: 'OpenStreetMap / Overpass',
        updatedAt,
      })
      continue
    }

    const points = (item.geometry ?? []).map((p) => [p.lat, p.lon] as [number, number])
    if (points.length < 3) continue
    result.push({
      id: `way-${item.id}`,
      district: normalizeDistrict(item.tags?.district),
      address: item.tags?.['addr:street'] ? `${item.tags['addr:street']} ${item.tags['addr:housenumber'] ?? ''}`.trim() : null,
      geometry: { type: 'Polygon', coordinates: [points.map((point) => [point[1], point[0]])] },
      centroid: centroid(points),
      source: 'OpenStreetMap / Overpass',
      updatedAt,
    })
  }
  return result
}
