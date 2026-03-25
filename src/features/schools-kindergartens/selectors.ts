import { buildDistrictEducationStats } from './utils/buildDistrictEducationStats'
import type { CoverageAssignment, EducationDistrictStats, Kindergarten, ResidentialBuilding, School } from './types'

export const totalSchools = (schools: School[]) => schools.length
export const totalKindergartens = (kindergartens: Kindergarten[]) => kindergartens.length

export const districtSchoolCounts = (schools: School[]) => schools.reduce<Record<string, number>>((acc, item) => {
  acc[item.district] = (acc[item.district] ?? 0) + 1
  return acc
}, {})

export const districtKindergartenCounts = (items: Kindergarten[]) => items.reduce<Record<string, number>>((acc, item) => {
  acc[item.district] = (acc[item.district] ?? 0) + 1
  return acc
}, {})

export const districtAssignedResidentialBuildings = (buildings: ResidentialBuilding[]) => buildings.reduce<Record<string, number>>((acc, item) => {
  const district = item.district ?? 'Не указан'
  acc[district] = (acc[district] ?? 0) + 1
  return acc
}, {})

export const buildingsPerSchool = (stats: EducationDistrictStats[]) => stats.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.district]: item.buildingsPerSchool }), {})
export const buildingsPerKindergarten = (stats: EducationDistrictStats[]) => stats.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.district]: item.buildingsPerKindergarten }), {})

export const districtCoverageRatio = (assignments: CoverageAssignment[], buildings: ResidentialBuilding[], institutionType: 'school' | 'kindergarten') => {
  if (buildings.length === 0) return 0
  const assigned = assignments.filter((item) => item.institutionType === institutionType).length
  return assigned / buildings.length
}

export const topLoadedDistrictsForSchools = (stats: EducationDistrictStats[]) => [...stats].sort((a, b) => b.buildingsPerSchool - a.buildingsPerSchool).slice(0, 5)
export const topLoadedDistrictsForKindergartens = (stats: EducationDistrictStats[]) => [...stats].sort((a, b) => b.buildingsPerKindergarten - a.buildingsPerKindergarten).slice(0, 5)

export const computeDistrictStats = (schools: School[], kindergartens: Kindergarten[], buildings: ResidentialBuilding[], assignments: CoverageAssignment[]) =>
  buildDistrictEducationStats(schools, kindergartens, buildings, assignments)
