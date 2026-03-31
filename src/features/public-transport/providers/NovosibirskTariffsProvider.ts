import { LiveCacheProvider } from '../../../live/providers/LiveCacheProvider'
import type { LiveSourceMode } from '../../../live/types'
import { parseTariffsCsv } from '../parsers/parseTariffsCsv'
import { defaultTransportFares } from '../data/defaultTransportData'
import type { TransportFare, TransportSourceStatus } from '../types'

const baseUrl = () => (import.meta.env.VITE_OPENDATA_PROXY_URL || import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru').replace(/\/$/, '')
const faresCsvUrl = () => `${baseUrl()}/datasets/51.csv`
const faresPassportUrl = () => `${baseUrl()}/pass.aspx?ID=51`
const faresSnapshotPath = '/live-data/opendata/transport-fares.json'
const ttlHours = 24
const parseVersion = '1.0.0'

interface TariffsPayload {
  fares: TransportFare[]
  updatedAt: string
}

export class NovosibirskTariffsProvider {
  private readonly cacheProvider
  private readonly fetchImpl

  constructor(cacheProvider = new LiveCacheProvider(), fetchImpl: typeof fetch = fetch) {
    this.cacheProvider = cacheProvider
    this.fetchImpl = fetchImpl
  }

  async load(mode: LiveSourceMode): Promise<{ fares: TransportFare[]; status: TransportSourceStatus }> {
    if (mode !== 'mock') {
      try {
        const response = await this.fetchImpl(faresCsvUrl(), { cache: 'no-store' })
        if (!response.ok) throw new Error(`Не удалось получить тарифы напрямую: ${response.status}`)
        const fetchedAt = new Date().toISOString()
        const fares = parseTariffsCsv(await response.text(), fetchedAt, 'opendata.novo-sibirsk.ru')
        await this.cacheProvider.write({
          key: 'transport-fares',
          payload: { fares, updatedAt: fetchedAt },
          fetchedAt,
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
          sourceUrl: faresCsvUrl(),
          parseVersion,
        })
        return {
          fares,
          status: { key: 'transport-fares', datasetId: '51', title: 'Тарифы на проезд', sourceUrl: faresPassportUrl(), source: 'runtime', dataType: 'real', status: 'ready', updatedAt: fetchedAt, fetchedAt, ttlHours, message: 'Набор данных 51 загружен напрямую из браузера.' },
        }
      } catch {
        // fall through
      }

      try {
        const snapshotResponse = await this.fetchImpl(faresSnapshotPath, { cache: 'no-store' })
        if (snapshotResponse.ok) {
          const payload = await snapshotResponse.json() as TariffsPayload
          return {
            fares: payload.fares,
            status: { key: 'transport-fares', datasetId: '51', title: 'Тарифы на проезд', sourceUrl: faresPassportUrl(), source: 'snapshot', dataType: 'real', status: 'ready', updatedAt: payload.updatedAt, fetchedAt: new Date().toISOString(), ttlHours, message: 'Показан последний сохраненный снимок набора данных 51.' },
          }
        }
      } catch {
        // fall through
      }

      const cache = await this.cacheProvider.read<TariffsPayload>('transport-fares')
      if (cache.entry) {
        return {
          fares: cache.entry.payload.fares,
          status: {
            key: 'transport-fares',
            datasetId: '51',
            title: 'Тарифы на проезд',
            sourceUrl: faresPassportUrl(),
            source: 'cache',
            dataType: cache.fresh ? 'real' : 'mock-fallback',
            status: cache.fresh ? 'ready' : 'stale',
            updatedAt: cache.entry.payload.updatedAt,
            fetchedAt: cache.entry.fetchedAt,
            ttlHours,
            message: cache.fresh ? 'Показан кэш набора данных 51.' : 'Показан устаревший кэш набора данных 51.',
          },
        }
      }
    }

    const fetchedAt = new Date().toISOString()
    return {
      fares: defaultTransportFares,
      status: {
        key: 'transport-fares',
        datasetId: '51',
        title: 'Тарифы на проезд',
        sourceUrl: faresPassportUrl(),
        source: 'mock',
        dataType: 'mock-fallback',
        status: 'stale',
        updatedAt: defaultTransportFares[0]?.updatedAt,
        fetchedAt,
        ttlHours,
        message: 'Показан демонстрационный резервный набор: локальный пример структуры набора данных 51.',
      },
    }
  }
}
