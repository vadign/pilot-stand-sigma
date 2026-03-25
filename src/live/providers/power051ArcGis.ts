import { build051Snapshot } from '../normalizers/normalize051ToSigma'
import type { OutageKind, Power051DistrictStat, Power051Snapshot, UtilityType } from '../types'
import { fetchArcGisFeatureCollection, type ArcGisFeatureCollection } from './arcGisQuery'

export interface ArcGis051FeatureAttributes {
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

export const power051PortalUrl = 'https://map.novo-sibirsk.ru/portal/disconnections?t='
export const power051ArcGisQueryUrl = 'https://map.novo-sibirsk.ru/elitegis/rest/services/maps/disconnections/MapServer/13/query'
export const power051ParseVersion = '1.1.0'

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

export const fetchPower051ArcGisCollection = (fetchImpl: typeof fetch = fetch): Promise<ArcGisFeatureCollection<ArcGis051FeatureAttributes>> => fetchArcGisFeatureCollection<ArcGis051FeatureAttributes>(
  power051ArcGisQueryUrl,
  {
    where: 'time_category=2',
    outFields: 'address,geocoded_address,district_name,type_id,start_date,end_date,description,system_id,time_category',
    returnGeometry: 'false',
  },
  fetchImpl,
)

export const buildPower051SnapshotFromArcGis = (
  raw: ArcGisFeatureCollection<ArcGis051FeatureAttributes>,
  {
    fetchedAt = new Date().toISOString(),
    parseVersion = power051ParseVersion,
    sourceUrl = power051PortalUrl,
    rawHash,
  }: {
    fetchedAt?: string
    parseVersion?: string
    sourceUrl?: string
    rawHash?: string
  } = {},
): Power051Snapshot => {
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

  return build051Snapshot({
    sourceUrl,
    snapshotAt: fetchedAt,
    fetchedAt,
    parseVersion,
    rawHash,
    planned: records.filter((item) => item.outageKind === 'planned'),
    emergency: records.filter((item) => item.outageKind === 'emergency'),
  })
}
