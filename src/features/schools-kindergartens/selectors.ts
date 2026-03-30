import type { EducationDistrictStat, EducationInstitution, EducationKindFilter } from './types'

const normalizeSearchValue = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е')

export const filterEducationInstitutions = (
  institutions: EducationInstitution[],
  district: string,
  kind: EducationKindFilter,
): EducationInstitution[] => institutions.filter((institution) =>
  (!district || institution.district === district)
  && (kind === 'all' || institution.kind === kind),
)

export const searchEducationInstitutions = (
  institutions: EducationInstitution[],
  query: string,
): EducationInstitution[] => {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return institutions

  return institutions.filter((institution) => {
    const haystack = normalizeSearchValue([
      institution.name,
      institution.district,
      institution.address,
      institution.phone ?? '',
      institution.site ?? '',
    ].join(' '))

    return haystack.includes(normalizedQuery)
  })
}

export const buildEducationDistrictStats = (institutions: EducationInstitution[]): EducationDistrictStat[] => {
  const districtMap = new Map<string, EducationDistrictStat>()

  for (const institution of institutions) {
    const current = districtMap.get(institution.district) ?? {
      district: institution.district,
      total: 0,
      schoolCount: 0,
      kindergartenCount: 0,
      kindergartenCapacity: 0,
      geocodedCount: 0,
    }

    current.total += 1
    if (institution.kind === 'school') current.schoolCount += 1
    if (institution.kind === 'kindergarten') {
      current.kindergartenCount += 1
      current.kindergartenCapacity += institution.capacity ?? 0
    }
    if (institution.coordinates) current.geocodedCount += 1

    districtMap.set(institution.district, current)
  }

  return Array.from(districtMap.values()).sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total
    return left.district.localeCompare(right.district, 'ru')
  })
}
