import { getDistrictId, getDistrictName } from '../../lib/districts'
import type { ConstructionActiveRecord, ConstructionCommissionedRecord, ConstructionPermitRecord, DistrictConstructionAggregate } from '../types'

const districtPatterns: Array<[string, RegExp[]]> = [
  ['sov', [/советск/i, /академгород/i]],
  ['len', [/ленинск/i]],
  ['oct', [/октябрьск/i]],
  ['zael', [/заельцов/i]],
  ['kal', [/калининск/i]],
  ['kirov', [/кировск/i]],
  ['perv', [/первомайск/i]],
  ['dzer', [/дзержинск/i]],
  ['kol', [/кольцов/i]],
]

export const extractDistrictFromAddress = (value: string): { districtId?: string; districtName?: string } => {
  const normalized = value.toLowerCase()
  const explicitId = getDistrictId(value)
  if (explicitId) return { districtId: explicitId, districtName: getDistrictName(explicitId) }

  const matched = districtPatterns.find(([, patterns]) => patterns.some((pattern) => pattern.test(normalized)))
  if (!matched) return { districtId: undefined, districtName: undefined }
  return { districtId: matched[0], districtName: getDistrictName(matched[0]) }
}

export const normalizePermitRecord = (row: Record<string, string>, index: number): ConstructionPermitRecord => {
  const district = extractDistrictFromAddress(row.AdrOr || '')
  return {
    id: `permit-${index}`,
    NomRazr: row.NomRazr || '',
    DatRazr: row.DatRazr || '',
    Zastr: row.Zastr || '',
    NameOb: row.NameOb || '',
    AdrOr: row.AdrOr || '',
    KadNom: row.KadNom || '',
    districtId: district.districtId,
    districtName: district.districtName,
    raw: row,
  }
}

export const normalizeCommissionedRecord = (row: Record<string, string>, index: number): ConstructionCommissionedRecord => {
  const district = row.Raion ? { districtId: getDistrictId(row.Raion), districtName: getDistrictName(row.Raion) } : extractDistrictFromAddress(row.AdrOb || '')
  return {
    id: `commissioned-${index}`,
    NomRazr: row.NomRazr || '',
    DatRazr: row.DatRazr || '',
    Zastr: row.Zastr || '',
    NameOb: row.NameOb || '',
    Raion: row.Raion || district.districtName || '',
    AdrOb: row.AdrOb || '',
    KadNom: row.KadNom || '',
    districtId: district.districtId,
    districtName: district.districtName,
    raw: row,
  }
}

export const calculateActiveConstruction = (permits: ConstructionPermitRecord[], commissioned: ConstructionCommissionedRecord[]): ConstructionActiveRecord[] => {
  const commissionedByCadastre = new Map(commissioned.map((item) => [item.KadNom, item]))
  const active = permits
    .filter((item) => item.KadNom && !commissionedByCadastre.has(item.KadNom))
    .map((item, index) => ({
      id: `active-${index}`,
      KadNom: item.KadNom,
      permit: item,
      status: 'active' as const,
      districtId: item.districtId,
      districtName: item.districtName,
      address: item.AdrOr,
      developer: item.Zastr,
      objectName: item.NameOb,
    }))

  const commissionedOnly = commissioned
    .filter((item) => item.KadNom && !permits.some((permit) => permit.KadNom === item.KadNom))
    .map((item, index) => ({
      id: `active-comm-${index}`,
      KadNom: item.KadNom,
      commissioned: item,
      status: 'commissioned_without_permit' as const,
      districtId: item.districtId,
      districtName: item.districtName,
      address: item.AdrOb,
      developer: item.Zastr,
      objectName: item.NameOb,
    }))

  return [...active, ...commissionedOnly]
}

export const aggregateConstructionByDistrict = (permits: ConstructionPermitRecord[], commissioned: ConstructionCommissionedRecord[], active: ConstructionActiveRecord[]): DistrictConstructionAggregate[] => {
  const districtNames = new Set<string>()
  const bump = (map: Map<string, DistrictConstructionAggregate>, districtId: string | undefined, districtName: string | undefined, field: 'permits' | 'commissioned' | 'activeConstruction') => {
    const key = districtId ?? districtName ?? 'unknown'
    const current = map.get(key) ?? { districtId, districtName: districtName ?? 'Район не определен', permits: 0, commissioned: 0, activeConstruction: 0 }
    current[field] += 1
    districtNames.add(current.districtName)
    map.set(key, current)
  }

  const map = new Map<string, DistrictConstructionAggregate>()
  permits.forEach((item) => bump(map, item.districtId, item.districtName, 'permits'))
  commissioned.forEach((item) => bump(map, item.districtId, item.districtName, 'commissioned'))
  active.forEach((item) => bump(map, item.districtId, item.districtName, 'activeConstruction'))
  return Array.from(map.values()).sort((left, right) => right.activeConstruction - left.activeConstruction || right.permits - left.permits)
}
