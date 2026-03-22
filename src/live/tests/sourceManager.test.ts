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

const makeManager = ({ runtimeOk, snapshotAt = snapshot051.snapshotAt, permitsUpdatedAt = constructionBundle.permitsMeta.fetchedAt }: { runtimeOk: boolean; snapshotAt?: string; permitsUpdatedAt?: string }) => {
  const localSnapshot = { ...snapshot051, snapshotAt }
  const localBundle: ConstructionDatasetBundle = {
    ...constructionBundle,
    permitsMeta: { ...constructionBundle.permitsMeta, updatedAt: permitsUpdatedAt },
  }

  return new LiveSourceManager(
    {
      getManifest: async () => ({ generatedAt: '2026-03-20T09:31:00.000Z', parseVersion: '1.0.0', records: [] }),
      get051Latest: async () => localSnapshot,
      get051History: async () => [localSnapshot],
      getConstructionBundle: async () => localBundle,
    } as never,
    {
      read: async () => ({ entry: undefined, fresh: false }),
      write: async () => undefined,
    } as never,
    {
      fetchRuntime: async () => {
        if (!runtimeOk) throw new Error('runtime down')
        return { payload: { snapshot: localSnapshot, incidents: [], summary: { totalHouses: 5, plannedHouses: 2, emergencyHouses: 3, activeIncidents: 2, topDistricts: [], utilities: [] }, }, meta: { source: 'runtime', type: 'real', fetchedAt: localSnapshot.fetchedAt, updatedAt: localSnapshot.snapshotAt, sourceUrl: localSnapshot.sourceUrl, status: 'ready', message: 'ok' } }
      },
    } as never,
    {
      fetchRuntime: async () => {
        if (!runtimeOk) throw new Error('runtime down')
        return { payload: localBundle, meta: { source: 'runtime', type: 'real', fetchedAt: localBundle.permitsMeta.fetchedAt, updatedAt: localBundle.permitsMeta.fetchedAt, sourceUrl: localBundle.permitsMeta.passportUrl, status: 'ready', message: 'ok' } }
      },
    } as never,
  )
}

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

  it('marks stale snapshots when ttl is exceeded', async () => {
    const bundle = await makeManager({
      runtimeOk: false,
      snapshotAt: '2026-03-18T09:30:00.000Z',
      permitsUpdatedAt: '2026-03-18T09:00:00.000Z',
    }).loadBundle({ mode: 'hybrid', runtimeEnabled: false })

    expect(bundle.outages.meta.source).toBe('snapshot')
    expect(bundle.outages.meta.status).toBe('stale')
    expect(bundle.outages.meta.message).toContain('устарел')
    expect(bundle.construction.meta.status).toBe('stale')
  })
})
