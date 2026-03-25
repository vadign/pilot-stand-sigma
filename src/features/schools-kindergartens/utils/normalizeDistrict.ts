import { getDistrictName } from '../../../lib/districts'

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').replace(/ё/g, 'е')

export const normalizeDistrict = (raw?: string): string => {
  if (!raw) return 'Не указан'
  const cleaned = normalize(raw).replace(/район/gi, '').trim()
  const mapped = getDistrictName(cleaned)
  return mapped || cleaned || 'Не указан'
}
