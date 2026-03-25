import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse051OffPage } from '../src/live/parsers/parse051OffPage.ts'
import { build051Snapshot } from '../src/live/normalizers/normalize051ToSigma.ts'
import type { LiveManifestRecord, Power051Snapshot } from '../src/live/types.ts'
import { buildPower051SnapshotFromArcGis, fetchPower051ArcGisCollection, power051ParseVersion, power051PortalUrl } from '../src/live/providers/power051ArcGis.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = join(root, 'src/live/tests/fixtures/051-off.html')
const liveRoot = join(root, 'public/live-data')
const portalUrl = process.env.VITE_051_PORTAL_URL || power051PortalUrl
const parseVersion = power051ParseVersion

const buildSnapshotFromHtml = (html: string): Power051Snapshot => {
  const fetchedAt = new Date().toISOString()
  const parsed = parse051OffPage(html)
  return build051Snapshot({
    sourceUrl: portalUrl,
    snapshotAt: parsed.snapshotAt,
    fetchedAt,
    parseVersion,
    rawHash: createHash('sha256').update(html).digest('hex'),
    planned: parsed.planned,
    emergency: parsed.emergency,
  })
}

const buildSnapshotFromArcGis = async (): Promise<{ snapshot: Power051Snapshot; raw: unknown }> => {
  const raw = await fetchPower051ArcGisCollection()
  const fetchedAt = new Date().toISOString()
  const rawPayload = JSON.stringify(raw)
  const snapshot = buildPower051SnapshotFromArcGis(raw, {
    fetchedAt,
    parseVersion,
    sourceUrl: portalUrl,
    rawHash: createHash('sha256').update(rawPayload).digest('hex'),
  })

  return { snapshot, raw }
}

const loadExistingLatest = async (): Promise<Power051Snapshot | undefined> => {
  try {
    return JSON.parse(await readFile(join(liveRoot, '051/latest.json'), 'utf-8')) as Power051Snapshot
  } catch {
    return undefined
  }
}

const fetchLatestSnapshot = async (): Promise<Power051Snapshot> => {
  try {
    const { snapshot, raw } = await buildSnapshotFromArcGis()
    await writeFile(join(liveRoot, '051/raw-latest.json'), JSON.stringify(raw, null, 2), 'utf-8')
    return snapshot
  } catch (arcGisError) {
    console.warn(`[sync:051] ArcGIS source unavailable: ${arcGisError instanceof Error ? arcGisError.message : String(arcGisError)}`)
  }

  const existing = await loadExistingLatest()
  if (existing) {
    console.warn('[sync:051] reuse existing latest snapshot: live sources unavailable')
    return existing
  }

  console.warn('[sync:051] fallback to fixture: all live sources unavailable')
  const html = await readFile(fixturePath, 'utf-8')
  await writeFile(join(liveRoot, '051/raw-latest.html'), html, 'utf-8')
  return buildSnapshotFromHtml(html)
}

const loadExistingHistory = async (): Promise<Power051Snapshot[]> => {
  try {
    return JSON.parse(await readFile(join(liveRoot, '051/history/index.json'), 'utf-8')) as Power051Snapshot[]
  } catch {
    return []
  }
}

export const sync051 = async (): Promise<LiveManifestRecord[]> => {
  await mkdir(join(liveRoot, '051/history'), { recursive: true })
  const snapshot = await fetchLatestSnapshot()

  const latestPath = join(liveRoot, '051/latest.json')
  await writeFile(latestPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  const history = (await loadExistingHistory()).filter((item) => new Date(item.fetchedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
  history.push(snapshot)
  await writeFile(join(liveRoot, '051/history/index.json'), JSON.stringify(history, null, 2), 'utf-8')
  const stampedPath = join(liveRoot, `051/history/${snapshot.fetchedAt.replace(/[:.]/g, '-')}.json`)
  await writeFile(stampedPath, JSON.stringify(snapshot, null, 2), 'utf-8')

  return [
    { key: '051-latest', title: '051 latest snapshot', path: '/live-data/051/latest.json', updatedAt: snapshot.snapshotAt, fetchedAt: snapshot.fetchedAt, ttlMinutes: 30, sourceUrl: snapshot.sourceUrl, type: 'real', status: 'ready' },
    { key: '051-history', title: '051 snapshot history', path: '/live-data/051/history/index.json', updatedAt: snapshot.snapshotAt, fetchedAt: snapshot.fetchedAt, ttlMinutes: 30, sourceUrl: snapshot.sourceUrl, type: 'real', status: 'ready' },
  ]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await sync051()
  console.log(`synced 051: ${manifest.map((item) => item.key).join(', ')}`)
}
