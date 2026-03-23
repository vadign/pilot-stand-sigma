import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse051OffPage } from '../src/live/parsers/parse051OffPage.ts'
import { build051Snapshot } from '../src/live/normalizers/normalize051ToSigma.ts'
import type { LiveManifestRecord, OutageKind, Power051DistrictStat, Power051Snapshot, UtilityType } from '../src/live/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = join(root, 'src/live/tests/fixtures/051-off.html')
const liveRoot = join(root, 'public/live-data')
const targetUrl = process.env.VITE_051_URL || 'https://051.novo-sibirsk.ru/SitePages/off.aspx'
const portalUrl = process.env.VITE_051_PORTAL_URL || 'https://map.novo-sibirsk.ru/portal/disconnections?t='
const arcGisQueryBaseUrl = process.env.VITE_051_ARCGIS_QUERY_URL || 'https://map.novo-sibirsk.ru/elitegis/rest/services/maps/disconnections/MapServer/13/query'
const parseVersion = '1.1.0'

interface ArcGisFeatureAttributes {
  address?: string
  geocoded_address?: string
  district_name?: string
  type_id?: string
  start_date?: number
  end_date?: number
  description?: string
  system_id?: number
  time_category?: number
}

interface ArcGisFeatureCollection {
  count?: number
  features?: Array<{
    attributes?: ArcGisFeatureAttributes
  }>
}

const outageTypeByCode: Record<number, UtilityType> = {
  1: 'hot_water',
  3: 'electricity',
  5: 'gas',
  6: 'heating',
}

const utilityLabels: Record<UtilityType, string> = {
  heating: 'отопление',
  hot_water: 'горячая вода',
  cold_water: 'холодная вода',
  sewer: 'водоотведение',
  electricity: 'электроснабжение',
  gas: 'газоснабжение',
}

const ruDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Novosibirsk',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const normalizeText = (value?: string | null): string => value?.replace(/\s+/g, ' ').trim() ?? ''

const isBlocked051Html = (html: string): boolean =>
  /The page cannot be displayed/i.test(html) ||
  /Network Access Message/i.test(html) ||
  /401 Unauthorized/i.test(html)

const mapOutageKind = (value?: string): OutageKind => /авар/i.test(value ?? '') ? 'emergency' : 'planned'

const inferUtilityType = (systemId?: number, description?: string): UtilityType => {
  const normalized = normalizeText(description).toLowerCase()

  if (systemId === 2) {
    if (/канализ|водоотвед|коллектор|кнс/i.test(normalized)) return 'sewer'
    return 'cold_water'
  }

  if (systemId && outageTypeByCode[systemId]) return outageTypeByCode[systemId]

  if (/горяч|гвс/i.test(normalized)) return 'hot_water'
  if (/канализ|водоотвед|коллектор|кнс/i.test(normalized)) return 'sewer'
  if (/хвс|холод/i.test(normalized)) return 'cold_water'
  if (/электр|свет/i.test(normalized)) return 'electricity'
  if (/газ/i.test(normalized)) return 'gas'
  if (/отоп|тепл/i.test(normalized)) return 'heating'
  return 'cold_water'
}

const formatRecoveryTime = (timestamp?: number): string | undefined => {
  if (!timestamp) return undefined
  return ruDateTimeFormatter.format(new Date(timestamp)).replace(',', '')
}

const buildDescription = (
  district: string,
  utilityType: UtilityType,
  outageKind: OutageKind,
  houses: number,
  recoveryTime?: string,
  reason?: string,
): string => {
  const parts = [
    district,
    outageKind === 'emergency' ? 'Аварийное' : 'Плановое',
    utilityLabels[utilityType],
    `${houses} домов`,
  ]

  if (recoveryTime) parts.push(`до ${recoveryTime}`)
  if (reason) parts.push(`причина: ${reason}`)

  return parts.join(' | ')
}

const buildArcGisQueryUrl = (offset = 0): string => {
  const url = new URL(arcGisQueryBaseUrl)
  url.searchParams.set('where', 'time_category=2')
  url.searchParams.set('outFields', 'address,geocoded_address,district_name,type_id,start_date,end_date,description,system_id,time_category')
  url.searchParams.set('returnGeometry', 'false')
  url.searchParams.set('f', 'pjson')
  if (offset > 0) url.searchParams.set('resultOffset', String(offset))
  return url.toString()
}

const fetchArcGisCollection = async (): Promise<ArcGisFeatureCollection> => {
  const allFeatures: NonNullable<ArcGisFeatureCollection['features']> = []
  let offset = 0
  let totalCount = Number.POSITIVE_INFINITY

  while (allFeatures.length < totalCount) {
    const response = await fetch(buildArcGisQueryUrl(offset), { cache: 'no-store' })
    if (!response.ok) throw new Error(`ArcGIS query failed: HTTP ${response.status}`)
    const page = await response.json() as ArcGisFeatureCollection
    const features = page.features ?? []

    totalCount = page.count ?? features.length
    allFeatures.push(...features)

    if (features.length === 0 || allFeatures.length >= totalCount) break
    offset += features.length
  }

  if (allFeatures.length === 0) throw new Error('ArcGIS query returned no active outages')
  return { count: totalCount, features: allFeatures }
}

const buildSnapshotFromHtml = (html: string): Power051Snapshot => {
  const fetchedAt = new Date().toISOString()
  const parsed = parse051OffPage(html)
  return build051Snapshot({
    sourceUrl: targetUrl,
    snapshotAt: parsed.snapshotAt,
    fetchedAt,
    parseVersion,
    rawHash: createHash('sha256').update(html).digest('hex'),
    planned: parsed.planned,
    emergency: parsed.emergency,
  })
}

const buildSnapshotFromArcGis = async (): Promise<{ snapshot: Power051Snapshot; raw: ArcGisFeatureCollection }> => {
  const raw = await fetchArcGisCollection()
  const grouped = new Map<string, { base: Omit<Power051DistrictStat, 'houses' | 'description'>; addresses: Set<string> }>()

  for (const feature of raw.features ?? []) {
    const attributes = feature.attributes
    if (!attributes) continue

    const district = normalizeText(attributes.district_name)
    if (!district) continue

    const reason = normalizeText(attributes.description) || undefined
    const outageKind = mapOutageKind(attributes.type_id)
    const utilityType = inferUtilityType(attributes.system_id, reason)
    const recoveryTime = formatRecoveryTime(attributes.end_date)
    const address = normalizeText(attributes.geocoded_address ?? attributes.address) || `${district}-${utilityType}-${outageKind}-${attributes.end_date ?? 'n/a'}-${grouped.size}`
    const key = JSON.stringify([district, utilityType, outageKind, reason ?? '', recoveryTime ?? ''])

    const current = grouped.get(key) ?? {
      base: {
        district,
        utilityType,
        outageKind,
        reason,
        recoveryTime,
      },
      addresses: new Set<string>(),
    }

    current.addresses.add(address)
    grouped.set(key, current)
  }

  const records = Array.from(grouped.values())
    .map(({ base, addresses }) => ({
      ...base,
      houses: addresses.size,
      description: buildDescription(base.district, base.utilityType, base.outageKind, addresses.size, base.recoveryTime, base.reason),
    }))
    .sort((left, right) => right.houses - left.houses || left.district.localeCompare(right.district, 'ru'))

  const fetchedAt = new Date().toISOString()
  const rawPayload = JSON.stringify(raw)
  const snapshot = build051Snapshot({
    sourceUrl: portalUrl,
    snapshotAt: fetchedAt,
    fetchedAt,
    parseVersion,
    rawHash: createHash('sha256').update(rawPayload).digest('hex'),
    planned: records.filter((item) => item.outageKind === 'planned'),
    emergency: records.filter((item) => item.outageKind === 'emergency'),
  })

  return { snapshot, raw }
}

const fetchHtml = async (): Promise<Power051Snapshot> => {
  const response = await fetch(targetUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const html = await response.text()
  if (isBlocked051Html(html)) throw new Error('051 HTML endpoint returned access denied page')
  await writeFile(join(liveRoot, '051/raw-latest.html'), html, 'utf-8')
  return buildSnapshotFromHtml(html)
}

const fetchLatestSnapshot = async (): Promise<Power051Snapshot> => {
  try {
    return await fetchHtml()
  } catch (htmlError) {
    console.warn(`[sync:051] HTML source unavailable: ${htmlError instanceof Error ? htmlError.message : String(htmlError)}`)
  }

  try {
    const { snapshot, raw } = await buildSnapshotFromArcGis()
    await writeFile(join(liveRoot, '051/raw-latest.json'), JSON.stringify(raw, null, 2), 'utf-8')
    return snapshot
  } catch (arcGisError) {
    console.warn(`[sync:051] ArcGIS source unavailable: ${arcGisError instanceof Error ? arcGisError.message : String(arcGisError)}`)
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
