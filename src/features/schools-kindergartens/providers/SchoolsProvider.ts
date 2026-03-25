import { LiveCacheProvider } from '../../../live/providers/LiveCacheProvider'
import type { LiveSourceMode } from '../../../live/types'
import { parseSchoolsCsv } from '../parsers/parseSchoolsCsv'
import { geocodeAddress } from '../utils/geocodeAddress'
import type { EducationSourceStatus, School } from '../types'

const baseUrl = () => (import.meta.env.VITE_OPENDATA_PROXY_URL || import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru').replace(/\/$/, '')
const csvUrl = () => `${baseUrl()}/datasets/28.csv`
const passportUrl = () => `${baseUrl()}/pass.aspx?ID=28`
const snapshotPath = '/live-data/opendata/schools-28.json'

export class SchoolsProvider {
  private readonly cache
  private readonly fetchImpl

  constructor(cache = new LiveCacheProvider(), fetchImpl: typeof fetch = fetch) {
    this.cache = cache
    this.fetchImpl = fetchImpl
  }

  async load(mode: LiveSourceMode): Promise<{ schools: School[]; status: EducationSourceStatus }> {
    if (mode !== 'mock') {
      try {
        const response = await this.fetchImpl(csvUrl(), { cache: 'no-store' })
        if (!response.ok) throw new Error(String(response.status))
        const updatedAt = new Date().toISOString()
        let schools = parseSchoolsCsv(await response.text(), updatedAt, 'opendata.novo-sibirsk.ru / ID 28')
        schools = await Promise.all(schools.map(async (school) => school.coordinates ? school : ({ ...school, coordinates: await geocodeAddress(school.addressRaw) })))
        await this.cache.write({ key: 'schools-28', payload: { schools, updatedAt }, sourceUrl: csvUrl(), fetchedAt: updatedAt, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), parseVersion: '1.0.0' })
        return { schools, status: { key: 'schools', title: 'Школы', source: 'runtime', dataType: 'real', status: 'ready', sourceUrl: passportUrl(), updatedAt, fetchedAt: updatedAt, message: 'ID 28 из live-источника' } }
      } catch {}

      try {
        const snapshotResponse = await this.fetchImpl(snapshotPath, { cache: 'no-store' })
        if (snapshotResponse.ok) {
          const data = await snapshotResponse.json() as { schools: School[]; updatedAt: string }
          return { schools: data.schools, status: { key: 'schools', title: 'Школы', source: 'snapshot', dataType: 'real', status: 'ready', sourceUrl: passportUrl(), updatedAt: data.updatedAt, fetchedAt: new Date().toISOString(), message: 'ID 28 из snapshot' } }
        }
      } catch {}

      const cache = await this.cache.read<{ schools: School[]; updatedAt: string }>('schools-28')
      if (cache.entry) {
        return { schools: cache.entry.payload.schools, status: { key: 'schools', title: 'Школы', source: 'cache', dataType: cache.fresh ? 'real' : 'mock-fallback', status: cache.fresh ? 'ready' : 'stale', sourceUrl: passportUrl(), updatedAt: cache.entry.payload.updatedAt, fetchedAt: cache.entry.fetchedAt, message: 'ID 28 из cache' } }
      }
    }

    const updatedAt = new Date().toISOString()
    return { schools: [], status: { key: 'schools', title: 'Школы', source: 'mock', dataType: 'mock-fallback', status: 'stale', sourceUrl: passportUrl(), updatedAt, fetchedAt: updatedAt, message: 'Нет live/snapshot, пустой mock-fallback' } }
  }
}
