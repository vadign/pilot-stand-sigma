import type { CoverageAssignment, EducationDistrictStats, Kindergarten, ResidentialBuilding, School } from '../types'

export const buildDistrictEducationStats = (
  schools: School[],
  kindergartens: Kindergarten[],
  buildings: ResidentialBuilding[],
  _assignments: CoverageAssignment[],
): EducationDistrictStats[] => {
  const districts = new Set<string>([
    ...schools.map((item) => item.district),
    ...kindergartens.map((item) => item.district),
    ...buildings.map((item) => item.district ?? 'Не указан'),
  ])

  return Array.from(districts).map((district) => {
    const schoolsCount = schools.filter((item) => item.district === district).length
    const kindergartensCount = kindergartens.filter((item) => item.district === district).length
    const buildingsCount = buildings.filter((item) => (item.district ?? 'Не указан') === district).length

    return {
      district,
      schools: schoolsCount,
      kindergartens: kindergartensCount,
      residentialBuildings: buildingsCount,
      buildingsPerSchool: schoolsCount === 0 ? 0 : Number((buildingsCount / schoolsCount).toFixed(2)),
      buildingsPerKindergarten: kindergartensCount === 0 ? 0 : Number((buildingsCount / kindergartensCount).toFixed(2)),
    }
  }).sort((a, b) => b.residentialBuildings - a.residentialBuildings)
}
