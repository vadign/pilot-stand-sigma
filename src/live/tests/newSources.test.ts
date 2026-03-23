import { describe, expect, it } from 'vitest'
import airPayload from './fixtures/openmeteo-air.json'
import weatherPayload from './fixtures/openmeteo-weather.json'
import overpassCameras from './fixtures/overpass-cameras.json'
import overpassMedical from './fixtures/overpass-medical.json'
import { parseOpenMeteoIndicators } from '../parsers/parseOpenMeteo'
import { parseOverpassObjects } from '../parsers/parseOverpass'
import { computeTrafficIndex } from '../providers/TrafficIndexProvider'
import { calculateActiveConstruction } from '../normalizers/normalizeConstructionToSigma'
import { classifyDistrictByPoint, buildEcologyRiskCards } from '../domain/geo'
import { districtBoundariesFixture } from '../domain/fixtures'
import { sigmaSourceRegistry } from '../config/sourceRegistry'
import { LiveSourceManager } from '../providers/LiveSourceManager'
import { build051Snapshot } from '../normalizers/normalize051ToSigma'
import type { ConstructionDatasetBundle } from '../types'

const snapshot051 = build051Snapshot({
  sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
  snapshotAt: '2026-03-20T09:30:00.000Z',
  fetchedAt: '2026-03-20T09:31:00.000Z',
  parseVersion: '1.0.0',
  planned: [{ district: 'Ленинский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
  emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 3 }],
})

const constructionBundle: ConstructionDatasetBundle = {
  permitsMeta: { id: '124', title: 'permits', passportUrl: 'https://example.test/124', fetchedAt: '2026-03-20T09:00:00.000Z', rows: 1, ttlMinutes: 1440 },
  commissionedMeta: { id: '125', title: 'commissioned', passportUrl: 'https://example.test/125', fetchedAt: '2026-03-20T09:00:00.000Z', rows: 0, ttlMinutes: 1440 },
  permits: [{ id: 'p1', NomRazr: '1', DatRazr: '2026-01-01', Zastr: 'Dev', NameOb: 'Obj', AdrOr: 'Советский район', KadNom: '54:35:091', districtId: 'sov', districtName: 'Советский', raw: {} }],
  commissioned: [],
  active: [{ id: 'a1', KadNom: '54:35:091', status: 'active', districtId: 'sov', districtName: 'Советский', address: 'Советский район', developer: 'Dev', objectName: 'Obj' }],
  aggregates: [{ districtId: 'sov', districtName: 'Советский', permits: 1, commissioned: 0, activeConstruction: 1 }],
}

const makeManager = ({ runtimeOk }: { runtimeOk: boolean }) => new LiveSourceManager(
  {
    getManifest: async () => ({ generatedAt: '2026-03-20T09:31:00.000Z', parseVersion: '1.0.0', records: [] }),
    get051Latest: async () => snapshot051,
    get051History: async () => [snapshot051],
    getConstructionBundle: async () => constructionBundle,
  } as never,
  { read: async () => ({ entry: undefined, fresh: false }), write: async () => undefined } as never,
  { fetchRuntime: async () => { if (!runtimeOk) throw new Error('runtime down'); return { payload: { snapshot: snapshot051, incidents: [], summary: { totalHouses: 5, plannedHouses: 2, emergencyHouses: 3, activeIncidents: 2, topDistricts: [], utilities: [] } }, meta: { source: 'runtime', type: 'real', fetchedAt: snapshot051.fetchedAt, updatedAt: snapshot051.snapshotAt, sourceUrl: snapshot051.sourceUrl, status: 'ready', message: 'ok' } } } } as never,
  { fetchRuntime: async () => { if (!runtimeOk) throw new Error('runtime down'); return { payload: constructionBundle, meta: { source: 'runtime', type: 'real', fetchedAt: constructionBundle.permitsMeta.fetchedAt, updatedAt: constructionBundle.permitsMeta.fetchedAt, sourceUrl: constructionBundle.permitsMeta.passportUrl, status: 'ready', message: 'ok' } } } } as never,
)

describe('new live sources', () => {
  it('parses open meteo fixtures', () => {
    const indicators = [...parseOpenMeteoIndicators(airPayload, 'source-openmeteo-air', '2026-03-22T08:00:00.000Z'), ...parseOpenMeteoIndicators(weatherPayload, 'source-openmeteo-weather', '2026-03-22T08:00:00.000Z')]
    expect(indicators.find((item) => item.metric === 'aqi')?.value).toBe(78)
    expect(indicators.find((item) => item.metric === 'temperature')?.value).toBe(-14)
  })

  it('parses overpass fixtures', () => {
    const cameras = parseOverpassObjects(overpassCameras, 'source-overpass-cameras', 'camera', 'oct', '2026-03-22T08:00:00.000Z')
    const medical = parseOverpassObjects(overpassMedical, 'source-overpass-medical', 'medical', 'oct', '2026-03-22T08:00:00.000Z')
    expect(cameras).toHaveLength(2)
    expect(medical[0]?.title).toContain('Больница')
  })

  it('builds explainable ecology risks and traffic index', () => {
    const indicators = [...parseOpenMeteoIndicators(airPayload, 'source-openmeteo-air', '2026-03-22T08:00:00.000Z'), ...parseOpenMeteoIndicators(weatherPayload, 'source-openmeteo-weather', '2026-03-22T08:00:00.000Z')]
    const risks = buildEcologyRiskCards(indicators)
    const traffic = computeTrafficIndex({ now: new Date('2026-03-22T01:00:00.000Z'), districtIds: ['sov', 'oct'], indicators })
    expect(risks[0]?.explanation.ruleId).toBe('smog_trap')
    expect(traffic[0]?.dataType).toBe('calculated')
  })

  it('calculates active construction diff by KadNom', () => {
    const active = calculateActiveConstruction([
      { id: 'p1', NomRazr: '', DatRazr: '', Zastr: '', NameOb: 'A', AdrOr: '', KadNom: '1', raw: {} },
      { id: 'p2', NomRazr: '', DatRazr: '', Zastr: '', NameOb: 'B', AdrOr: '', KadNom: '2', raw: {} },
    ], [
      { id: 'c1', NomRazr: '', DatRazr: '', Zastr: '', NameOb: 'A', Raion: '', AdrOb: '', KadNom: '1', raw: {} },
    ])
    expect(active.some((item) => item.KadNom === '2')).toBe(true)
    expect(active.some((item) => item.status === 'commissioned_without_permit')).toBe(false)
  })

  it('classifies district by polygon with fallback', () => {
    const polygon = classifyDistrictByPoint([54.865, 83.09], districtBoundariesFixture)
    const fallback = classifyDistrictByPoint([56, 84], districtBoundariesFixture)
    expect(polygon.districtId).toBe('sov')
    expect(fallback.quality).toBe('centroid-fallback')
  })

  it('contains required source registry ids', () => {
    expect(sigmaSourceRegistry.some((item) => item.id === 'source-openmeteo-air')).toBe(true)
    expect(sigmaSourceRegistry.some((item) => item.id === 'source-overpass-medical')).toBe(true)
    expect(sigmaSourceRegistry.some((item) => item.id === 'source-traffic-index')).toBe(true)
  })

  it('returns expanded source statuses and domain layers', async () => {
    const bundle = await makeManager({ runtimeOk: false }).loadBundle({ mode: 'hybrid', runtimeEnabled: false })
    expect(bundle.sourceStatuses.length).toBeGreaterThan(8)
    expect(bundle.domain.referenceObjects.length).toBeGreaterThan(4)
    expect(bundle.domain.trafficIndex[0]?.dataType).toBe('calculated')
  })
})
