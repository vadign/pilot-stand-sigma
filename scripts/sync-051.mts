import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse051OffPage } from '../src/live/parsers/parse051OffPage.ts'
import { build051Snapshot } from '../src/live/normalizers/normalize051ToSigma.ts'
import type { LiveManifestRecord, Power051Snapshot } from '../src/live/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = join(root, 'src/live/tests/fixtures/051-off.html')
const liveRoot = join(root, 'public/live-data')
const targetUrl = process.env.VITE_051_URL || 'https://051.novo-sibirsk.ru/SitePages/off.aspx'
const parseVersion = '1.0.0'

const fetchHtml = async (): Promise<string> => {
  try {
    const response = await fetch(targetUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    console.warn(`[sync:051] fallback to fixture: ${error instanceof Error ? error.message : String(error)}`)
    return readFile(fixturePath, 'utf-8')
  }
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
  const html = await fetchHtml()
  const fetchedAt = new Date().toISOString()
  await writeFile(join(liveRoot, '051/raw-latest.html'), html, 'utf-8')

  const parsed = parse051OffPage(html)
  const snapshot = build051Snapshot({
    sourceUrl: targetUrl,
    snapshotAt: parsed.snapshotAt,
    fetchedAt,
    parseVersion,
    rawHash: createHash('sha256').update(html).digest('hex'),
    planned: parsed.planned,
    emergency: parsed.emergency,
  })

  const latestPath = join(liveRoot, '051/latest.json')
  await writeFile(latestPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  const history = (await loadExistingHistory()).filter((item) => new Date(item.fetchedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
  history.push(snapshot)
  await writeFile(join(liveRoot, '051/history/index.json'), JSON.stringify(history, null, 2), 'utf-8')
  const stampedPath = join(liveRoot, `051/history/${fetchedAt.replace(/[:.]/g, '-')}.json`)
  await writeFile(stampedPath, JSON.stringify(snapshot, null, 2), 'utf-8')

  return [
    { key: '051-latest', title: '051 latest snapshot', path: '/live-data/051/latest.json', updatedAt: snapshot.snapshotAt, fetchedAt, ttlMinutes: 30, sourceUrl: targetUrl, type: 'real', status: 'ready' },
    { key: '051-history', title: '051 snapshot history', path: '/live-data/051/history/index.json', updatedAt: snapshot.snapshotAt, fetchedAt, ttlMinutes: 30, sourceUrl: targetUrl, type: 'real', status: 'ready' },
  ]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await sync051()
  console.log(`synced 051: ${manifest.map((item) => item.key).join(', ')}`)
}
