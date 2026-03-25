import { LiveCacheProvider } from '../../../live/providers/LiveCacheProvider'
import type { LiveSourceMode } from '../../../live/types'
import { parseResidentialOsm } from '../parsers/parseResidentialOsm'
import type { EducationSourceStatus, ResidentialBuilding } from '../types'

const snapshotPath = '/live-data/osm/residential-buildings-nsk.json'
const overpassEndpoint = 'https://overpass-api.de/api/interpreter'
const query = `[out:json][timeout:30];area["name"="Новосибирск"]->.searchArea;(way["building"~"residential|house|apartments"](area.searchArea);node["building"~"residential|house|apartments"](area.searchArea););out geom;`

export class ResidentialBuildingsProvider {
  private readonly cache
  private readonly fetchImpl

  constructor(cache = new LiveCacheProvider(), fetchImpl: typeof fetch = fetch) {
    this.cache = cache
    this.fetchImpl = fetchImpl
  }

  async load(mode: LiveSourceMode): Promise<{ buildings: ResidentialBuilding[]; status: EducationSourceStatus }> {
    if (mode !== 'mock') {
      try {
        const response = await this.fetchImpl(overpassEndpoint, { method: 'POST', body: query, cache: 'no-store' })
        if (!response.ok) throw new Error(String(response.status))
        const updatedAt = new Date().toISOString()
        const buildings = parseResidentialOsm(await response.json() as { elements: never[] }, updatedAt)
        await this.cache.write({ key: 'residential-osm', payload: { buildings, updatedAt }, fetchedAt: updatedAt, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), sourceUrl: overpassEndpoint, parseVersion: '1.0.0' })
        return { buildings, status: { key: 'residential', title: 'Жилые здания OSM', source: 'runtime', dataType: 'real', status: 'ready', sourceUrl: 'https://www.openstreetmap.org', updatedAt, fetchedAt: updatedAt, message: 'OSM/Overpass live' } }
      } catch {}

      try {
        const snapshotResponse = await this.fetchImpl(snapshotPath, { cache: 'no-store' })
        if (snapshotResponse.ok) {
          const data = await snapshotResponse.json() as { buildings: ResidentialBuilding[]; updatedAt: string }
          return { buildings: data.buildings, status: { key: 'residential', title: 'Жилые здания OSM', source: 'snapshot', dataType: 'real', status: 'ready', sourceUrl: 'https://www.openstreetmap.org', updatedAt: data.updatedAt, fetchedAt: new Date().toISOString(), message: 'OSM snapshot' } }
        }
      } catch {}

      const cache = await this.cache.read<{ buildings: ResidentialBuilding[]; updatedAt: string }>('residential-osm')
      if (cache.entry) {
        return { buildings: cache.entry.payload.buildings, status: { key: 'residential', title: 'Жилые здания OSM', source: 'cache', dataType: cache.fresh ? 'real' : 'mock-fallback', status: cache.fresh ? 'ready' : 'stale', sourceUrl: 'https://www.openstreetmap.org', updatedAt: cache.entry.payload.updatedAt, fetchedAt: cache.entry.fetchedAt, message: 'OSM cache' } }
      }
    }

    const updatedAt = new Date().toISOString()
    return { buildings: [], status: { key: 'residential', title: 'Жилые здания OSM', source: 'mock', dataType: 'mock-fallback', status: 'stale', sourceUrl: 'https://www.openstreetmap.org', updatedAt, fetchedAt: updatedAt, message: 'OSM fallback пустой' } }
  }
}
