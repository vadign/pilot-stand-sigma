import { findDistrictId, getDistrictName } from '../../lib/districts'

const normalize = (value: string): string => value.toLowerCase().replace(/ё/g, 'е')

const DISTRICT_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Дзержинский', aliases: ['дзержинский', 'дзержинского', 'дзержинском', 'дзержинскому', 'дзержинским'] },
  { canonical: 'Железнодорожный', aliases: ['железнодорожный', 'железнодорожного', 'железнодорожном', 'железнодорожному', 'железнодорожным'] },
  { canonical: 'Заельцовский', aliases: ['заельцовский', 'заельцовского', 'заельцовском', 'заельцовскому', 'заельцовским'] },
  { canonical: 'Калининский', aliases: ['калининский', 'калининского', 'калининском', 'калининскому', 'калининским'] },
  { canonical: 'Кировский', aliases: ['кировский', 'кировского', 'кировском', 'кировскому', 'кировским'] },
  { canonical: 'Ленинский', aliases: ['ленинский', 'ленинского', 'ленинском', 'ленинскому', 'ленинским'] },
  { canonical: 'Октябрьский', aliases: ['октябрьский', 'октябрьского', 'октябрьском', 'октябрьскому', 'октябрьским'] },
  { canonical: 'Первомайский', aliases: ['первомайский', 'первомайского', 'первомайском', 'первомайскому', 'первомайским'] },
  { canonical: 'Советский', aliases: ['советский', 'советского', 'советском', 'советскому', 'советским'] },
  { canonical: 'Центральный', aliases: ['центральный', 'центрального', 'центральном', 'центральному', 'центральным', 'центр'] },
]

const SUBDISTRICTS: Array<{ rawLabel: string; aliases: string[]; parentDistrict: string; specialArea?: boolean }> = [
  { rawLabel: 'Академгородок', aliases: ['академгородок', 'академгородке', 'академгородка', 'академгородку'], parentDistrict: 'Советский' },
  { rawLabel: 'Шлюз', aliases: ['шлюз', 'шлюзе', 'шлюза'], parentDistrict: 'Советский' },
  { rawLabel: 'Кольцово', aliases: ['кольцово', 'кольцове'], parentDistrict: 'Кольцово', specialArea: true },
]

export interface TransportDistrictFilter {
  district: string
  rawLabel?: string
  parentDistrict?: string
  districtId?: string
  specialArea?: boolean
  source: 'explicit' | 'implicit'
}

const detectSubdistrict = (normalizedText: string) => {
  const found = SUBDISTRICTS.find((item) => item.aliases.some((alias) => normalizedText.includes(alias)))
  if (!found) return undefined
  const districtId = findDistrictId(found.parentDistrict)
  return {
    district: found.parentDistrict,
    rawLabel: found.rawLabel,
    parentDistrict: found.parentDistrict,
    districtId,
    specialArea: found.specialArea,
  }
}

const detectDistrictsByAliases = (normalizedText: string) => {
  const matches = DISTRICT_ALIASES.flatMap((item) => item.aliases.map((alias) => ({
    district: item.canonical,
    alias,
    index: normalizedText.indexOf(alias),
  }))).filter((entry) => entry.index >= 0)

  return matches
    .sort((left, right) => left.index - right.index)
    .map((entry) => ({ district: entry.district, districtId: findDistrictId(entry.district) }))
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.district === entry.district) === index)
}

export const detectTransportDistrictFilters = (text: string): TransportDistrictFilter[] => {
  const normalizedText = normalize(text)
  const subdistrict = detectSubdistrict(normalizedText)
  const directDistricts = detectDistrictsByAliases(normalizedText)
  const filters: TransportDistrictFilter[] = []

  if (subdistrict) filters.push({ ...subdistrict, source: 'explicit' })
  directDistricts.forEach((directDistrict) => {
    if (!filters.some((item) => item.district === directDistrict.district)) filters.push({ ...directDistrict, source: 'explicit' })
  })

  if (filters.length > 0) return filters

  const legacyDistrictId = findDistrictId(text)
  if (!legacyDistrictId) return []
  return [{ district: getDistrictName(legacyDistrictId), districtId: legacyDistrictId, source: 'explicit' }]
}

export const detectRouteFromText = (text: string): string | undefined =>
  text.match(/маршрут[а-я\s]*?(\d+[a-zа-я-]*)/i)?.[1] ?? text.match(/\b(\d+[a-zа-я-]*)\b/i)?.[1]

export const detectTransportMode = (text: string): string | undefined => {
  const normalizedText = normalize(text)
  if (normalizedText.includes('троллейбус')) return 'trolleybus'
  if (normalizedText.includes('трамва')) return 'tram'
  if (normalizedText.includes('метро')) return 'metro'
  if (normalizedText.includes('маршрутк')) return 'minibus'
  if (normalizedText.includes('автобус')) return 'bus'
  return undefined
}

export const formatTransportDistrictLabel = (filter?: Pick<TransportDistrictFilter, 'rawLabel' | 'parentDistrict' | 'district'>): string => {
  if (!filter) return ''
  if (filter.rawLabel && filter.parentDistrict) return `${filter.rawLabel} (${filter.parentDistrict} район)`
  return filter.district
}

export const buildPublicTransportLink = (params?: Record<string, string | boolean | undefined>): string => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return
      if (typeof value === 'boolean') {
        if (value) searchParams.set(key, 'true')
        return
      }
      if (String(value).trim()) searchParams.set(key, String(value))
    })
  }

  const query = searchParams.toString()
  return query ? `/public-transport?${query}` : '/public-transport'
}
