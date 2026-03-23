import { districts } from '../../mocks/data'
import { sigmaSourceRegistry, sourceRegistry } from '../config/sourceRegistry'
import { buildEcologyRiskCards, buildDistrictTransitRoutes, classifyDistrictByPoint } from '../domain/geo'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import { aggregateConstructionByDistrict } from '../normalizers/normalizeConstructionToSigma'
import type { ConstructionDatasetBundle, LiveBundle, LiveSourceMode, LiveSourceResult, Power051Snapshot, SigmaLiveOutageIncident, SigmaSourceStatus } from '../types'
import { LiveCacheProvider } from './LiveCacheProvider'
import { LiveSnapshotProvider } from './LiveSnapshotProvider'
import { NovosibirskOpenDataProvider } from './NovosibirskOpenDataProvider'
import { Power051Provider } from './Power051Provider'
import { OpenMeteoAirProvider } from './OpenMeteoAirProvider'
import { OpenMeteoWeatherProvider } from './OpenMeteoWeatherProvider'
import { CityAirProvider } from './CityAirProvider'
import { OverpassCamerasProvider } from './OverpassCamerasProvider'
import { OverpassMedicalProvider } from './OverpassMedicalProvider'
import { OpendataTopicProvider } from './OpendataTopicProvider'
import { ConstructionDerivedProvider } from './ConstructionDerivedProvider'
import { TrafficIndexProvider } from './TrafficIndexProvider'
import { DistrictBoundaryProvider } from './DistrictBoundaryProvider'

const PARSE_VERSION = '2.0.0'

interface ManagerOptions {
  mode: LiveSourceMode
  runtimeEnabled: boolean
}

const createCacheEntry = <T,>(key: string, payload: T, ttlMinutes: number, sourceUrl: string) => ({
  key,
  payload,
  fetchedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
  sourceUrl,
  parseVersion: PARSE_VERSION,
})

const createStatus = (id: string, patch: Partial<SigmaSourceStatus>): SigmaSourceStatus => {
  const registry = sigmaSourceRegistry.find((item) => item.id === id)
  if (!registry) throw new Error(`Unknown source ${id}`)
  return {
    ...registry,
    origin: 'snapshot',
    message: 'Источник зарегистрирован.',
    parseVersion: PARSE_VERSION,
    freshnessLabel: `${Math.round(registry.ttlMs / 60000)} мин`,
    ...patch,
  }
}

export class LiveSourceManager {
  private readonly snapshotProvider
  private readonly cacheProvider
  private readonly powerProvider
  private readonly openDataProvider
  private readonly openMeteoAirProvider
  private readonly openMeteoWeatherProvider
  private readonly cityAirProvider
  private readonly overpassCamerasProvider
  private readonly overpassMedicalProvider
  private readonly opendataTopicProvider
  private readonly constructionDerivedProvider
  private readonly trafficIndexProvider
  private readonly districtBoundaryProvider

  constructor(
    snapshotProvider = new LiveSnapshotProvider(),
    cacheProvider = new LiveCacheProvider(),
    powerProvider = new Power051Provider(),
    openDataProvider = new NovosibirskOpenDataProvider(),
    openMeteoAirProvider = new OpenMeteoAirProvider(),
    openMeteoWeatherProvider = new OpenMeteoWeatherProvider(),
    cityAirProvider = new CityAirProvider(),
    overpassCamerasProvider = new OverpassCamerasProvider(),
    overpassMedicalProvider = new OverpassMedicalProvider(),
    opendataTopicProvider = new OpendataTopicProvider(),
    constructionDerivedProvider = new ConstructionDerivedProvider(),
    trafficIndexProvider = new TrafficIndexProvider(),
    districtBoundaryProvider = new DistrictBoundaryProvider(),
  ) {
    this.snapshotProvider = snapshotProvider
    this.cacheProvider = cacheProvider
    this.powerProvider = powerProvider
    this.openDataProvider = openDataProvider
    this.openMeteoAirProvider = openMeteoAirProvider
    this.openMeteoWeatherProvider = openMeteoWeatherProvider
    this.cityAirProvider = cityAirProvider
    this.overpassCamerasProvider = overpassCamerasProvider
    this.overpassMedicalProvider = overpassMedicalProvider
    this.opendataTopicProvider = opendataTopicProvider
    this.constructionDerivedProvider = constructionDerivedProvider
    this.trafficIndexProvider = trafficIndexProvider
    this.districtBoundaryProvider = districtBoundaryProvider
  }

  async loadBundle({ mode, runtimeEnabled }: ManagerOptions): Promise<LiveBundle> {
    const outages = await this.resolveOutages(mode, runtimeEnabled)
    const construction = await this.resolveConstruction(mode, runtimeEnabled)
    const [airIndicators, weatherIndicators, cityAirIndicators, cameras, medical, directories, districtBoundaries] = await Promise.all([
      this.openMeteoAirProvider.fetchSnapshot(),
      this.openMeteoWeatherProvider.fetchSnapshot(),
      this.cityAirProvider.fetchSnapshot(),
      this.overpassCamerasProvider.fetchSnapshot(),
      this.overpassMedicalProvider.fetchSnapshot(),
      this.opendataTopicProvider.fetchSnapshot(),
      this.districtBoundaryProvider.fetchSnapshot(),
    ])

    const indicators = [...airIndicators, ...weatherIndicators, ...cityAirIndicators]
    const allReferences = [...cameras, ...medical, ...directories].map((item) => {
      if (item.districtId) return item
      const classified = classifyDistrictByPoint(item.coordinates, districtBoundaries)
      return { ...item, districtId: classified.districtId, districtName: classified.districtName }
    })
    const riskCards = buildEcologyRiskCards(indicators)
    const trafficIndex = this.trafficIndexProvider.build(indicators, districts.map((item) => item.id))
    const transitRoutes = buildDistrictTransitRoutes(allReferences)
    const constructionObjects = this.constructionDerivedProvider.buildObjects(construction.payload)

    const sourceStatuses: SigmaSourceStatus[] = [
      createStatus('source-051', {
        status: outages.meta.status,
        origin: outages.meta.source,
        message: outages.meta.message,
        lastUpdated: outages.meta.updatedAt,
        lastSuccess: outages.meta.status === 'ready' ? outages.meta.updatedAt : undefined,
        objectCount: outages.payload.incidents.length,
      }),
      createStatus('source-openmeteo-air', { status: 'ready', origin: 'snapshot', message: 'Снимок качества воздуха подготовлен.', lastUpdated: indicators.find((item) => item.sourceId === 'source-openmeteo-air')?.updatedAt, objectCount: airIndicators.length }),
      createStatus('source-openmeteo-weather', { status: 'ready', origin: 'snapshot', message: 'Снимок погоды подготовлен.', lastUpdated: indicators.find((item) => item.sourceId === 'source-openmeteo-weather')?.updatedAt, objectCount: weatherIndicators.length }),
      createStatus('source-cityair', { status: this.cityAirProvider.isEnabled() ? 'ready' : 'stale', origin: this.cityAirProvider.isEnabled() ? 'snapshot' : 'mock', message: this.cityAirProvider.isEnabled() ? 'CityAir включен конфигурацией.' : 'CityAir отключен: API key не задан.', lastUpdated: cityAirIndicators[0]?.updatedAt, objectCount: cityAirIndicators.length, enabled: this.cityAirProvider.isEnabled() }),
      createStatus('source-overpass-cameras', { status: 'ready', origin: 'snapshot', message: 'Справочный слой камер ПДД загружен.', lastUpdated: cameras[0]?.updatedAt, objectCount: cameras.length }),
      createStatus('source-overpass-medical', { status: 'ready', origin: 'snapshot', message: 'Справочный слой медучреждений загружен.', lastUpdated: medical[0]?.updatedAt, objectCount: medical.length }),
      createStatus('source-opendata-stops', { status: 'ready', origin: 'snapshot', message: 'Слой остановок и справочных объектов загружен.', lastUpdated: directories[0]?.updatedAt, objectCount: directories.filter((item) => item.category === 'stop').length }),
      createStatus('source-opendata-schools', { status: 'ready', origin: 'snapshot', message: 'Слой школ загружен.', lastUpdated: directories.find((item) => item.category === 'school')?.updatedAt, objectCount: directories.filter((item) => item.category === 'school').length }),
      createStatus('source-opendata-kindergartens', { status: 'ready', origin: 'snapshot', message: 'Слой детсадов загружен.', lastUpdated: directories.find((item) => item.category === 'kindergarten')?.updatedAt, objectCount: directories.filter((item) => item.category === 'kindergarten').length }),
      createStatus('source-opendata-libraries', { status: 'ready', origin: 'snapshot', message: 'Слой библиотек загружен.', lastUpdated: directories.find((item) => item.category === 'library')?.updatedAt, objectCount: directories.filter((item) => item.category === 'library').length }),
      createStatus('source-opendata-pharmacies', { status: 'ready', origin: 'snapshot', message: 'Слой аптек загружен.', lastUpdated: directories.find((item) => item.category === 'pharmacy')?.updatedAt, objectCount: directories.filter((item) => item.category === 'pharmacy').length }),
      createStatus('source-opendata-sport-grounds', { status: 'ready', origin: 'snapshot', message: 'Слой спортплощадок загружен.', lastUpdated: directories.find((item) => item.category === 'sport_ground')?.updatedAt, objectCount: directories.filter((item) => item.category === 'sport_ground').length }),
      createStatus('source-opendata-sport-orgs', { status: 'ready', origin: 'snapshot', message: 'Слой спортивных организаций загружен.', lastUpdated: directories.find((item) => item.category === 'sport_org')?.updatedAt, objectCount: directories.filter((item) => item.category === 'sport_org').length }),
      createStatus('source-opendata-culture', { status: 'ready', origin: 'snapshot', message: 'Слой культурных объектов загружен.', lastUpdated: directories.find((item) => item.category === 'culture')?.updatedAt, objectCount: directories.filter((item) => item.category === 'culture').length }),
      createStatus('source-opendata-parking', { status: 'ready', origin: 'snapshot', message: 'Слой муниципальных парковок загружен.', lastUpdated: directories.find((item) => item.category === 'parking')?.updatedAt, objectCount: directories.filter((item) => item.category === 'parking').length }),
      createStatus('source-opendata-construction-permits', { status: construction.meta.status, origin: construction.meta.source, message: 'Реестр разрешений интегрирован через OpenData bundle.', lastUpdated: construction.payload.permitsMeta.fetchedAt, rowCount: construction.payload.permits.length }),
      createStatus('source-opendata-construction-commissioned', { status: construction.meta.status, origin: construction.meta.source, message: 'Реестр ввода в эксплуатацию интегрирован через OpenData bundle.', lastUpdated: construction.payload.commissionedMeta.fetchedAt, rowCount: construction.payload.commissioned.length }),
      createStatus('source-osm-boundaries', { status: 'ready', origin: 'snapshot', message: 'Полигоны районов доступны для spatial enrichment.', lastUpdated: districtBoundaries[0]?.updatedAt, objectCount: districtBoundaries.length }),
      createStatus('source-traffic-index', { status: 'ready', origin: 'runtime', message: 'Индекс дорожной нагрузки рассчитан на лету.', lastUpdated: trafficIndex[0]?.updatedAt, objectCount: trafficIndex.length }),
    ]

    return {
      mode,
      outages,
      construction,
      domain: {
        indicators,
        referenceObjects: allReferences,
        districtBoundaries,
        riskCards,
        transitRoutes,
        constructionObjects,
        trafficIndex,
      },
      sourceStatuses,
    }
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
          status: 'ready',
          message: 'Показан последний локальный snapshot 051.',
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
        return {
          payload: { ...bundle, aggregates: bundle.aggregates.length > 0 ? bundle.aggregates : aggregateConstructionByDistrict(bundle.permits, bundle.commissioned, bundle.active) },
          meta: {
            source: 'snapshot',
            type: 'real',
            fetchedAt: bundle.permitsMeta.fetchedAt,
            updatedAt: bundle.permitsMeta.updatedAt,
            sourceUrl: bundle.permitsMeta.passportUrl,
            status: 'ready',
            message: 'Показан последний локальный snapshot OpenData.',
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
