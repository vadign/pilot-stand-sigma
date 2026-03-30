import { sourceRegistry } from '../config/sourceRegistry'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import type { LiveBundle, LiveSourceMode, LiveSourceResult, Power051Snapshot, SigmaLiveOutageIncident, SourceStatusCard } from '../types'
import { LiveCacheProvider } from './LiveCacheProvider'
import { LiveSnapshotProvider } from './LiveSnapshotProvider'
import { Power051Provider } from './Power051Provider'

const PARSE_VERSION = '1.0.0'

interface ManagerOptions {
  mode: LiveSourceMode
  runtimeEnabled: boolean
}

interface CachedOutagesPayload {
  snapshot: Power051Snapshot
  incidents: SigmaLiveOutageIncident[]
  summary: LiveBundle['outages']['payload']['summary']
  history: Power051Snapshot[]
}

type CachedOutagesReadResult = { entry?: { payload: CachedOutagesPayload; fetchedAt: string; sourceUrl: string }; fresh: boolean }

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

  constructor(
    snapshotProvider = new LiveSnapshotProvider(),
    cacheProvider = new LiveCacheProvider(),
    powerProvider = new Power051Provider(),
  ) {
    this.snapshotProvider = snapshotProvider
    this.cacheProvider = cacheProvider
    this.powerProvider = powerProvider
  }

  async loadBundle({ mode, runtimeEnabled }: ManagerOptions): Promise<LiveBundle> {
    const outages = await this.resolveOutages(mode, runtimeEnabled)
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
    ]

    return { mode, outages, sourceStatuses }
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
      return this.buildSnapshotResult(snapshot.latest, snapshot.history, previousSnapshot)
    }

    const cache = await this.cacheProvider.read<CachedOutagesPayload>('051')
    if (mode !== 'mock') {
      const cacheResult = this.buildCacheResult(cache)
      if (cacheResult) return cacheResult
    }

    return this.buildMockResult()
  }



  private buildSnapshotResult(snapshot: Power051Snapshot, history: Power051Snapshot[], previousSnapshot?: Power051Snapshot): LiveBundle['outages'] {
    return {
      payload: {
        snapshot,
        incidents: normalize051ToSigmaIncidents(snapshot),
        summary: summarize051Snapshot(snapshot, previousSnapshot),
        history,
      },
      meta: {
        source: 'snapshot',
        type: 'real',
        fetchedAt: snapshot.fetchedAt,
        updatedAt: snapshot.snapshotAt,
        sourceUrl: snapshot.sourceUrl,
        status: 'ready',
        message: 'Показан последний локальный snapshot 051.',
      },
    }
  }

  private buildCacheResult(cache: CachedOutagesReadResult): LiveBundle['outages'] | null {
    if (!cache.entry) return null
    return {
      payload: cache.entry.payload,
      meta: {
        source: 'cache',
        type: cache.fresh ? 'real' : 'mock-fallback',
        fetchedAt: cache.entry.fetchedAt,
        updatedAt: cache.entry.payload.snapshot.snapshotAt,
        sourceUrl: cache.entry.sourceUrl,
        status: cache.fresh ? 'ready' : 'stale',
        message: cache.fresh ? 'Показан кэшированный ответ 051.' : 'Показан устаревший кэш 051.',
      },
    }
  }

  private buildMockResult(): LiveBundle['outages'] {
    const now = new Date().toISOString()
    const mock = build051Snapshot({
      sourceUrl: sourceRegistry.power051.sourceUrl,
      snapshotAt: now,
      fetchedAt: now,
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
        message: 'Данные 051 недоступны, показан mock fallback.',
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
