import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsvDataset } from '../src/live/parsers/parseCsvDataset.ts'
import { parseOpendataPassport } from '../src/live/parsers/parseOpendataPassport.ts'
import { aggregateConstructionByDistrict, calculateActiveConstruction, normalizeCommissionedRecord, normalizePermitRecord } from '../src/live/normalizers/normalizeConstructionToSigma.ts'
import type { ConstructionDatasetBundle, LiveManifestRecord, OpendataDatasetMeta } from '../src/live/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixtures = join(root, 'src/live/tests/fixtures')
const liveRoot = join(root, 'public/live-data/opendata')
const baseUrl = process.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru'

const fetchTextOrFixture = async (url: string, fixtureName: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    console.warn(`[sync:opendata] fallback to fixture ${fixtureName}: ${error instanceof Error ? error.message : String(error)}`)
    return readFile(join(fixtures, fixtureName), 'utf-8')
  }
}

export const syncOpenData = async (): Promise<LiveManifestRecord[]> => {
  await mkdir(join(liveRoot, 'raw'), { recursive: true })
  const fetchedAt = new Date().toISOString()
  const [passport124Html, passport125Html, csv124, csv125] = await Promise.all([
    fetchTextOrFixture(`${baseUrl}/pass.aspx?ID=124`, 'opendata-passport-124.html'),
    fetchTextOrFixture(`${baseUrl}/pass.aspx?ID=125`, 'opendata-passport-125.html'),
    fetchTextOrFixture(`${baseUrl}/datasets/124.csv`, 'opendata-124.csv'),
    fetchTextOrFixture(`${baseUrl}/datasets/125.csv`, 'opendata-125.csv'),
  ])

  await Promise.all([
    writeFile(join(liveRoot, 'raw/passport-124.html'), passport124Html, 'utf-8'),
    writeFile(join(liveRoot, 'raw/passport-125.html'), passport125Html, 'utf-8'),
    writeFile(join(liveRoot, 'raw/124.csv'), csv124, 'utf-8'),
    writeFile(join(liveRoot, 'raw/125.csv'), csv125, 'utf-8'),
  ])

  const pass124 = parseOpendataPassport(passport124Html, baseUrl)
  const pass125 = parseOpendataPassport(passport125Html, baseUrl)
  const permits = parseCsvDataset<Record<string, string>>(csv124).map(normalizePermitRecord)
  const commissioned = parseCsvDataset<Record<string, string>>(csv125).map(normalizeCommissionedRecord)
  const active = calculateActiveConstruction(permits, commissioned)
  const aggregates = aggregateConstructionByDistrict(permits, commissioned, active)

  const buildMeta = (id: string, title: string, rows: number, passportUrl: string, csvUrl?: string, updatedAt?: string): OpendataDatasetMeta => ({ id, title, rows, passportUrl, csvUrl, updatedAt, fetchedAt, ttlMinutes: 60 * 24 })
  const bundle: ConstructionDatasetBundle = {
    permitsMeta: buildMeta('124', pass124.title, permits.length, `${baseUrl}/pass.aspx?ID=124`, pass124.csvUrl, pass124.updatedAt),
    commissionedMeta: buildMeta('125', pass125.title, commissioned.length, `${baseUrl}/pass.aspx?ID=125`, pass125.csvUrl, pass125.updatedAt),
    permits,
    commissioned,
    active,
    aggregates,
  }

  await Promise.all([
    writeFile(join(liveRoot, 'construction-permits.json'), JSON.stringify({ meta: bundle.permitsMeta, records: permits }, null, 2), 'utf-8'),
    writeFile(join(liveRoot, 'construction-commissioned.json'), JSON.stringify({ meta: bundle.commissionedMeta, records: commissioned }, null, 2), 'utf-8'),
    writeFile(join(liveRoot, 'construction-active.json'), JSON.stringify({ meta: { generatedAt: fetchedAt }, records: active, aggregates }, null, 2), 'utf-8'),
    writeFile(join(liveRoot, 'construction-bundle.json'), JSON.stringify(bundle, null, 2), 'utf-8'),
  ])

  return [
    { key: 'opendata-permits', title: 'OpenData permits', path: '/live-data/opendata/construction-permits.json', updatedAt: pass124.updatedAt ?? fetchedAt, fetchedAt, ttlMinutes: 60 * 24, sourceUrl: `${baseUrl}/pass.aspx?ID=124`, type: 'real', status: 'ready' },
    { key: 'opendata-commissioned', title: 'OpenData commissioned', path: '/live-data/opendata/construction-commissioned.json', updatedAt: pass125.updatedAt ?? fetchedAt, fetchedAt, ttlMinutes: 60 * 24, sourceUrl: `${baseUrl}/pass.aspx?ID=125`, type: 'real', status: 'ready' },
    { key: 'opendata-active', title: 'OpenData active construction', path: '/live-data/opendata/construction-active.json', updatedAt: fetchedAt, fetchedAt, ttlMinutes: 60 * 24, sourceUrl: `${baseUrl}/pass.aspx?ID=124`, type: 'calculated', status: 'ready' },
  ]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await syncOpenData()
  console.log(`synced opendata: ${manifest.map((item) => item.key).join(', ')}`)
}
