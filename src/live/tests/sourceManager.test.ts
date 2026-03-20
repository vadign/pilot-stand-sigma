import { describe, expect, it } from 'vitest'
import type { ConstructionDatasetBundle, LiveBundle } from '../types'
import { LiveSourceManager } from '../providers/LiveSourceManager'
import { build051Snapshot } from '../normalizers/normalize051ToSigma'

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
  permits: [],
  commissioned: [],
  active: [],
  aggregates: [],
}

const makeManager = ({ runtimeOk }: { runtimeOk: boolean }) => new LiveSourceManager(
  {
    getManifest: async () => ({ generatedAt: '2026-03-20T09:31:00.000Z', parseVersion: '1.0.0', records: [] }),
    get051Latest: async () => snapshot051,
    get051History: async () => [snapshot051],
    getConstructionBundle: async () => constructionBundle,
  } as never,
  {
    read: async () => ({ entry: undefined, fresh: false }),
    write: async () => undefined,
  } as never,
  {
    fetchRuntime: async () => {
      if (!runtimeOk) throw new Error('runtime down')
      return { payload: { snapshot: snapshot051, incidents: [], summary: { totalHouses: 5, plannedHouses: 2, emergencyHouses: 3, activeIncidents: 2, topDistricts: [], utilities: [] }, }, meta: { source: 'runtime', type: 'real', fetchedAt: snapshot051.fetchedAt, updatedAt: snapshot051.snapshotAt, sourceUrl: snapshot051.sourceUrl, status: 'ready', message: 'ok' } }
    },
  } as never,
  {
    fetchRuntime: async () => {
      if (!runtimeOk) throw new Error('runtime down')
      return { payload: constructionBundle, meta: { source: 'runtime', type: 'real', fetchedAt: constructionBundle.permitsMeta.fetchedAt, updatedAt: constructionBundle.permitsMeta.fetchedAt, sourceUrl: constructionBundle.permitsMeta.passportUrl, status: 'ready', message: 'ok' } }
    },
  } as never,
)

describe('LiveSourceManager', () => {
  it('prefers runtime over snapshot when enabled', async () => {
    const bundle = await makeManager({ runtimeOk: true }).loadBundle({ mode: 'hybrid', runtimeEnabled: true })
    expect(bundle.outages.meta.source).toBe('runtime')
    expect(bundle.construction.meta.source).toBe('runtime')
  })

  it('falls back to snapshot when runtime fails', async () => {
    const bundle = await makeManager({ runtimeOk: false }).loadBundle({ mode: 'hybrid', runtimeEnabled: true })
    expect(bundle.outages.meta.source).toBe('snapshot')
    expect(bundle.construction.meta.source).toBe('snapshot')
  })

  it('obeys mock mode', async () => {
    const bundle = await makeManager({ runtimeOk: true }).loadBundle({ mode: 'mock', runtimeEnabled: true })
    expect(bundle.mode).toBe('mock')
    expect(bundle.outages.meta.source).toBe('mock')
  })

  it('returns source statuses', async () => {
    const bundle: LiveBundle = await makeManager({ runtimeOk: false }).loadBundle({ mode: 'hybrid', runtimeEnabled: false })
    expect(bundle.sourceStatuses).toHaveLength(2)
    expect(bundle.sourceStatuses[0]?.ttlMinutes).toBe(30)
  })
})
