import { LiveCacheProvider } from '../../../live/providers/LiveCacheProvider'
import type { LiveSourceMode } from '../../../live/types'
import { parseStopsCsv } from '../parsers/parseStopsCsv'
import { defaultTransportStops } from '../data/defaultTransportData'
import type { TransitStop, TransportSourceStatus } from '../types'

const baseUrl = () => (import.meta.env.VITE_OPENDATA_PROXY_URL || import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru').replace(/\/$/, '')
const stopsCsvUrl = () => `${baseUrl()}/datasets/49.csv`
const stopsPassportUrl = () => `${baseUrl()}/pass.aspx?ID=49`
const stopsSnapshotPath = '/live-data/opendata/transport-stops.json'
const ttlHours = 24
const parseVersion = '1.0.0'

interface StopsPayload {
  stops: TransitStop[]
  updatedAt: string
}

export class NovosibirskStopsProvider {
  private readonly cacheProvider
  private readonly fetchImpl

  constructor(cacheProvider = new LiveCacheProvider(), fetchImpl: typeof fetch = fetch) {
    this.cacheProvider = cacheProvider
    this.fetchImpl = fetchImpl
  }

  async load(mode: LiveSourceMode): Promise<{ stops: TransitStop[]; status: TransportSourceStatus }> {
    if (mode !== 'mock') {
      try {
        const response = await this.fetchImpl(stopsCsvUrl(), { cache: 'no-store' })
        if (!response.ok) throw new Error(`Не удалось получить остановки напрямую: ${response.status}`)
        const fetchedAt = new Date().toISOString()
        const stops = parseStopsCsv(await response.text(), fetchedAt, 'opendata.novo-sibirsk.ru')
        await this.cacheProvider.write({
          key: 'transport-stops',
          payload: { stops, updatedAt: fetchedAt },
          fetchedAt,
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
          sourceUrl: stopsCsvUrl(),
          parseVersion,
        })
        return {
          stops,
          status: { key: 'transport-stops', datasetId: '49', title: 'Остановки наземного транспорта', sourceUrl: stopsPassportUrl(), source: 'runtime', dataType: 'real', status: 'ready', updatedAt: fetchedAt, fetchedAt, ttlHours, message: 'Набор данных 49 загружен напрямую из браузера.' },
        }
      } catch {
        // fall through
      }

      try {
        const snapshotResponse = await this.fetchImpl(stopsSnapshotPath, { cache: 'no-store' })
        if (snapshotResponse.ok) {
          const payload = await snapshotResponse.json() as StopsPayload
          return {
            stops: payload.stops,
            status: { key: 'transport-stops', datasetId: '49', title: 'Остановки наземного транспорта', sourceUrl: stopsPassportUrl(), source: 'snapshot', dataType: 'real', status: 'ready', updatedAt: payload.updatedAt, fetchedAt: new Date().toISOString(), ttlHours, message: 'Показан последний сохраненный снимок набора данных 49.' },
          }
        }
      } catch {
        // fall through
      }

      const cache = await this.cacheProvider.read<StopsPayload>('transport-stops')
      if (cache.entry) {
        return {
          stops: cache.entry.payload.stops,
          status: {
            key: 'transport-stops',
            datasetId: '49',
            title: 'Остановки наземного транспорта',
            sourceUrl: stopsPassportUrl(),
            source: 'cache',
            dataType: cache.fresh ? 'real' : 'mock-fallback',
            status: cache.fresh ? 'ready' : 'stale',
            updatedAt: cache.entry.payload.updatedAt,
            fetchedAt: cache.entry.fetchedAt,
            ttlHours,
            message: cache.fresh ? 'Показан кэш набора данных 49.' : 'Показан устаревший кэш набора данных 49.',
          },
        }
      }
    }

    const fetchedAt = new Date().toISOString()
    return {
      stops: defaultTransportStops,
      status: {
        key: 'transport-stops',
        datasetId: '49',
        title: 'Остановки наземного транспорта',
        sourceUrl: stopsPassportUrl(),
        source: 'mock',
        dataType: 'mock-fallback',
        status: 'stale',
        updatedAt: defaultTransportStops[0]?.updatedAt,
        fetchedAt,
        ttlHours,
        message: 'Показан демонстрационный резервный набор: локальный пример структуры набора данных 49.',
      },
    }
  }
}
