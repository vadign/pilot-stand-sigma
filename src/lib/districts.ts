import { districts } from '../mocks/data'

const normalizeDistrictKey = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+район$/, '')

const districtNameByKey = Object.fromEntries(
  districts.flatMap(({ id, name }) => [
    [normalizeDistrictKey(id), name],
    [normalizeDistrictKey(name), name],
  ]),
)

export const getDistrictName = (district?: string): string => {
  if (!district) return ''

  return districtNameByKey[normalizeDistrictKey(district)] ?? district
}
