import { sourceRegistry } from '../config/sourceRegistry'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import { aggregateConstructionByDistrict } from '../normalizers/normalizeConstructionToSigma'
import type { ConstructionDatasetBundle, LiveBundle, LiveSourceMode, LiveSourceResult, Power051Snapshot, SigmaLiveOutageIncident, SourceStatusCard } from '../types'
import { LiveCacheProvider } from './LiveCacheProvider'
import { LiveSnapshotProvider } from './LiveSnapshotProvider'
import { NovosibirskOpenDataProvider } from './NovosibirskOpenDataProvider'
import { Power051Provider } from './Power051Provider'

const PARSE_VERSION = '1.0.0'

interface ManagerOptions {
  mode: LiveSourceMode
  runtimeEnabled: boolean
}

const resolveFreshnessStatus = (updatedAt: string | undefined, ttlMinutes: number): { status: 'ready' | 'stale'; isStale: boolean } => {
  if (!updatedAt) return { status: 'stale', isStale: true }
  const ageMs = Date.now() - new Date(updatedAt).getTime()
  const isStale = Number.isNaN(ageMs) || ageMs > ttlMinutes * 60 * 1000
  return { status: isStale ? 'stale' : 'ready', isStale }
}

const createCacheEntry = <T,>(key: string, payload: T, ttlMinutes: number, sourceUrl: string) => ({
  key,
  payload,
  fetchedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
  sourceUrl,
  parseVersion: PARSE_VERSION,
})

export class LiveSourceManager {
  private readonly snapshotProvider
  private readonly cacheProvider
  private readonly powerProvider
  private readonly openDataProvider

  constructor(
    snapshotProvider = new LiveSnapshotProvider(),
    cacheProvider = new LiveCacheProvider(),
    powerProvider = new Power051Provider(),
    openDataProvider = new NovosibirskOpenDataProvider(),
  ) {
    this.snapshotProvider = snapshotProvider
    this.cacheProvider = cacheProvider
    this.powerProvider = powerProvider
    this.openDataProvider = openDataProvider
  }

  async loadBundle({ mode, runtimeEnabled }: ManagerOptions): Promise<LiveBundle> {
    const outages = await this.resolveOutages(mode, runtimeEnabled)
    const construction = await this.resolveConstruction(mode, runtimeEnabled)
    const sourceStatuses: SourceStatusCard[] = [
      {
        key: '051',
        title: sourceRegistry.power051.title,
        sourceUrl: outages.meta.sourceUrl,
        updatedAt: outages.meta.updatedAt,
        fetchedAt: outages.meta.fetchedAt,
        ttlMinutes: sourceRegistry.power051.ttlMinutes,
        status: outages.meta.status,
        type: outages.meta.type,
        message: outages.meta.message,
        source: outages.meta.source,
      },
      {
        key: 'opendata',
        title: sourceRegistry.constructionActive.title,
        sourceUrl: construction.meta.sourceUrl,
        updatedAt: construction.meta.updatedAt,
        fetchedAt: construction.meta.fetchedAt,
        ttlMinutes: sourceRegistry.constructionActive.ttlMinutes,
        status: construction.meta.status,
        type: construction.meta.type,
        message: construction.meta.message,
        source: construction.meta.source,
      },
    ]

    return { mode, outages, construction, sourceStatuses }
  }

  private async resolveOutages(mode: LiveSourceMode, runtimeEnabled: boolean): Promise<LiveBundle['outages']> {
    const snapshot = await this.safeSnapshot051()
    const previousSnapshot = snapshot.history.at(-2)

    if (mode !== 'mock' && runtimeEnabled) {
      try {
        const runtime = await this.powerProvider.fetchRuntime(snapshot.latest)
        const payload = { ...runtime.payload, history: [...snapshot.history, runtime.payload.snapshot].slice(-336) }
        await this.cacheProvider.write(createCacheEntry('051', payload, sourceRegistry.power051.ttlMinutes, runtime.meta.sourceUrl))
        return { payload, meta: runtime.meta }
      } catch {
        // fall through
      }
    }

    if (mode !== 'mock' && snapshot.latest) {
      const current = snapshot.latest
      const freshness = resolveFreshnessStatus(current.snapshotAt, sourceRegistry.power051.ttlMinutes)
      return {
        payload: {
          snapshot: current,
          incidents: normalize051ToSigmaIncidents(current),
          summary: summarize051Snapshot(current, previousSnapshot),
          history: snapshot.history,
        },
        meta: {
          source: 'snapshot',
          type: 'real',
          fetchedAt: current.fetchedAt,
          updatedAt: current.snapshotAt,
          sourceUrl: current.sourceUrl,
          status: freshness.status,
          message: freshness.isStale ? 'Показан локальный snapshot 051, но он устарел по TTL.' : 'Показан последний локальный snapshot 051.',
        },
      }
    }

    const cache = await this.cacheProvider.read<{ snapshot: Power051Snapshot; incidents: SigmaLiveOutageIncident[]; summary: LiveBundle['outages']['payload']['summary']; history: Power051Snapshot[] }>('051')
    if (mode !== 'mock' && cache.entry) {
      return {
        payload: cache.entry.payload,
        meta: {
          source: 'cache',
          type: cache.fresh ? 'real' : 'mock-fallback',
          fetchedAt: cache.entry.fetchedAt,
          updatedAt: cache.entry.payload.snapshot.snapshotAt,
          sourceUrl: cache.entry.sourceUrl,
          status: cache.fresh ? 'ready' : 'stale',
          message: cache.fresh ? 'Показан кэшированный live-ответ 051.' : 'Показан устаревший кэш 051.',
        },
      }
    }

    const mock = build051Snapshot({
      sourceUrl: sourceRegistry.power051.sourceUrl,
      snapshotAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      parseVersion: PARSE_VERSION,
      planned: [],
      emergency: [],
    })
    return {
      payload: {
        snapshot: mock,
        incidents: [],
        summary: summarize051Snapshot(mock),
        history: [],
      },
      meta: {
        source: 'mock',
        type: 'mock-fallback',
        fetchedAt: mock.fetchedAt,
        updatedAt: mock.snapshotAt,
        sourceUrl: mock.sourceUrl,
        status: 'stale',
        message: 'Live-данные 051 недоступны, показан mock fallback.',
      },
    }
  }

  private async resolveConstruction(mode: LiveSourceMode, runtimeEnabled: boolean): Promise<LiveBundle['construction']> {
    if (mode !== 'mock' && runtimeEnabled) {
      try {
        const runtime = await this.openDataProvider.fetchRuntime()
        await this.cacheProvider.write(createCacheEntry('opendata-construction', runtime.payload, sourceRegistry.constructionActive.ttlMinutes, runtime.meta.sourceUrl))
        return runtime
      } catch {
        // fall through
      }
    }

    if (mode !== 'mock') {
      try {
        const bundle = await this.snapshotProvider.getConstructionBundle()
        const freshness = resolveFreshnessStatus(bundle.permitsMeta.updatedAt ?? bundle.permitsMeta.fetchedAt, sourceRegistry.constructionActive.ttlMinutes)
        return {
          payload: { ...bundle, aggregates: bundle.aggregates.length > 0 ? bundle.aggregates : aggregateConstructionByDistrict(bundle.permits, bundle.commissioned, bundle.active) },
          meta: {
            source: 'snapshot',
            type: 'real',
            fetchedAt: bundle.permitsMeta.fetchedAt,
            updatedAt: bundle.permitsMeta.updatedAt ?? bundle.permitsMeta.fetchedAt,
            sourceUrl: bundle.permitsMeta.passportUrl,
            status: freshness.status,
            message: freshness.isStale ? 'Показан локальный snapshot OpenData, но он устарел по TTL.' : 'Показан последний локальный snapshot OpenData.',
          },
        }
      } catch {
        // fall through
      }
    }

    const cache = await this.cacheProvider.read<ConstructionDatasetBundle>('opendata-construction')
    if (mode !== 'mock' && cache.entry) {
      return {
        payload: cache.entry.payload,
        meta: {
          source: 'cache',
          type: cache.fresh ? 'real' : 'mock-fallback',
          fetchedAt: cache.entry.fetchedAt,
          updatedAt: cache.entry.payload.permitsMeta.updatedAt,
          sourceUrl: cache.entry.sourceUrl,
          status: cache.fresh ? 'ready' : 'stale',
          message: cache.fresh ? 'Показан кэшированный OpenData.' : 'Показан устаревший кэш OpenData.',
        },
      }
    }

    const emptyBundle: ConstructionDatasetBundle = {
      permitsMeta: { id: '124', title: 'Разрешения на строительство', passportUrl: sourceRegistry.constructionPermits.sourceUrl, fetchedAt: new Date().toISOString(), rows: 0, ttlMinutes: sourceRegistry.constructionPermits.ttlMinutes },
      commissionedMeta: { id: '125', title: 'Ввод в эксплуатацию', passportUrl: sourceRegistry.constructionCommissioned.sourceUrl, fetchedAt: new Date().toISOString(), rows: 0, ttlMinutes: sourceRegistry.constructionCommissioned.ttlMinutes },
      permits: [],
      commissioned: [],
      active: [],
      aggregates: [],
    }
    return {
      payload: emptyBundle,
      meta: {
        source: 'mock',
        type: 'mock-fallback',
        fetchedAt: emptyBundle.permitsMeta.fetchedAt,
        updatedAt: emptyBundle.permitsMeta.fetchedAt,
        sourceUrl: emptyBundle.permitsMeta.passportUrl,
        status: 'stale',
        message: 'Live-данные OpenData недоступны, показан mock fallback.',
      },
    }
  }

  private async safeSnapshot051(): Promise<{ latest?: Power051Snapshot; history: Power051Snapshot[] }> {
    try {
      const [latest, history] = await Promise.all([
        this.snapshotProvider.get051Latest(),
        this.snapshotProvider.get051History().catch(() => []),
      ])
      return { latest, history: history.length > 0 ? history : [latest] }
    } catch {
      return { history: [] }
    }
  }
}

export const createMockLiveResult = <T,>(payload: T, sourceUrl: string, message: string): LiveSourceResult<T> => ({
  payload,
  meta: {
    source: 'mock',
    type: 'mock-fallback',
    fetchedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceUrl,
    status: 'stale',
    message,
  },
})
