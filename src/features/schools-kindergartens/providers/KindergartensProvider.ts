import { LiveCacheProvider } from '../../../live/providers/LiveCacheProvider'
import type { LiveSourceMode } from '../../../live/types'
import { parseKindergartensCsv } from '../parsers/parseKindergartensCsv'
import { geocodeAddress } from '../utils/geocodeAddress'
import type { EducationSourceStatus, Kindergarten } from '../types'

const baseUrl = () => (import.meta.env.VITE_OPENDATA_PROXY_URL || import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru').replace(/\/$/, '')
const csvUrl = () => `${baseUrl()}/datasets/27.csv`
const passportUrl = () => `${baseUrl()}/pass.aspx?ID=27`
const snapshotPath = '/live-data/opendata/kindergartens-27.json'

export class KindergartensProvider {
  private readonly cache
  private readonly fetchImpl

  constructor(cache = new LiveCacheProvider(), fetchImpl: typeof fetch = fetch) {
    this.cache = cache
    this.fetchImpl = fetchImpl
  }

  async load(mode: LiveSourceMode): Promise<{ kindergartens: Kindergarten[]; status: EducationSourceStatus }> {
    if (mode !== 'mock') {
      try {
        const response = await this.fetchImpl(csvUrl(), { cache: 'no-store' })
        if (!response.ok) throw new Error(String(response.status))
        const updatedAt = new Date().toISOString()
        let kindergartens = parseKindergartensCsv(await response.text(), updatedAt, 'opendata.novo-sibirsk.ru / ID 27')
        kindergartens = await Promise.all(kindergartens.map(async (item) => item.coordinates ? item : ({ ...item, coordinates: await geocodeAddress(item.addressRaw) })))
        await this.cache.write({ key: 'kindergartens-27', payload: { kindergartens, updatedAt }, sourceUrl: csvUrl(), fetchedAt: updatedAt, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), parseVersion: '1.0.0' })
        return { kindergartens, status: { key: 'kindergartens', title: 'Детские сады', source: 'runtime', dataType: 'real', status: 'ready', sourceUrl: passportUrl(), updatedAt, fetchedAt: updatedAt, message: 'ID 27 из live-источника' } }
      } catch {}

      try {
        const snapshotResponse = await this.fetchImpl(snapshotPath, { cache: 'no-store' })
        if (snapshotResponse.ok) {
          const data = await snapshotResponse.json() as { kindergartens: Kindergarten[]; updatedAt: string }
          return { kindergartens: data.kindergartens, status: { key: 'kindergartens', title: 'Детские сады', source: 'snapshot', dataType: 'real', status: 'ready', sourceUrl: passportUrl(), updatedAt: data.updatedAt, fetchedAt: new Date().toISOString(), message: 'ID 27 из snapshot' } }
        }
      } catch {}

      const cache = await this.cache.read<{ kindergartens: Kindergarten[]; updatedAt: string }>('kindergartens-27')
      if (cache.entry) {
        return { kindergartens: cache.entry.payload.kindergartens, status: { key: 'kindergartens', title: 'Детские сады', source: 'cache', dataType: cache.fresh ? 'real' : 'mock-fallback', status: cache.fresh ? 'ready' : 'stale', sourceUrl: passportUrl(), updatedAt: cache.entry.payload.updatedAt, fetchedAt: cache.entry.fetchedAt, message: 'ID 27 из cache' } }
      }
    }

    const updatedAt = new Date().toISOString()
    return { kindergartens: [], status: { key: 'kindergartens', title: 'Детские сады', source: 'mock', dataType: 'mock-fallback', status: 'stale', sourceUrl: passportUrl(), updatedAt, fetchedAt: updatedAt, message: 'Нет live/snapshot, пустой mock-fallback' } }
  }
}
