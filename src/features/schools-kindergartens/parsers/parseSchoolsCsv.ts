import { parseCsvDataset } from '../../../live/parsers/parseCsvDataset'
import { normalizeDistrict } from '../utils/normalizeDistrict'
import type { School } from '../types'

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const found = Object.keys(row).find((header) => header.toLowerCase().includes(key))
    if (found && row[found]) return row[found]
  }
  return ''
}

export const parseSchoolsCsv = (csvText: string, updatedAt: string, source: string): School[] => {
  const rows = parseCsvDataset<Record<string, string>>(csvText)
  return rows.map((row, index) => {
    const name = pick(row, ['наименование', 'организац'])
    const district = normalizeDistrict(pick(row, ['район']))
    const street = pick(row, ['улица'])
    const house = pick(row, ['дом'])
    const addressRaw = pick(row, ['адрес']) || [street, house].filter(Boolean).join(', ')
    const phone = pick(row, ['телефон'])
    const director = pick(row, ['руковод'])
    const lat = Number(pick(row, ['широта', 'lat']))
    const lon = Number(pick(row, ['долгота', 'lon']))

    return {
      id: `school-${index + 1}`,
      name,
      district,
      street,
      house,
      addressRaw,
      phone,
      director,
      coordinates: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, origin: 'source-native' as const } : null,
      source,
      updatedAt,
      dataType: 'real' as const,
      dataTypeEntity: 'school' as const,
    }
  }).filter((item) => Boolean(item.name))
}
