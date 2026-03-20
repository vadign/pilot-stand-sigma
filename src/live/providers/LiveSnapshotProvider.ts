import type { ConstructionDatasetBundle, LiveManifest, Power051Snapshot } from '../types'

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) throw new Error(`snapshot fetch failed: ${response.status}`)
  return response.json() as Promise<T>
}

export class LiveSnapshotProvider {
  getManifest(): Promise<LiveManifest> {
    return fetchJson('/live-data/manifest.json')
  }

  get051Latest(): Promise<Power051Snapshot> {
    return fetchJson('/live-data/051/latest.json')
  }

  async get051History(): Promise<Power051Snapshot[]> {
    const manifest = await this.getManifest()
    const record = manifest.records.find((item) => item.key === '051-history')
    if (!record) return []
    return fetchJson(record.path)
  }

  getConstructionBundle(): Promise<ConstructionDatasetBundle> {
    return fetchJson('/live-data/opendata/construction-bundle.json')
  }
}
