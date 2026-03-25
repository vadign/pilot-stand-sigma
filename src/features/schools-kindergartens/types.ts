import type { LiveSourceMode } from '../../live/types'

export type EducationInstitutionType = 'school' | 'kindergarten'
export type DataType = 'real' | 'derived' | 'approximate' | 'mock-fallback'

export type PointGeometry = { type: 'Point'; coordinates: [number, number] }
export type PolygonGeometry = { type: 'Polygon'; coordinates: number[][][] }
export type EducationGeometry = PointGeometry | PolygonGeometry

export interface InstitutionCoordinates {
  lat: number
  lon: number
  origin: 'source-native' | 'derived'
}

export interface School {
  id: string; name: string; district: string; street: string; house: string; addressRaw: string; phone: string; director: string
  coordinates: InstitutionCoordinates | null; source: string; updatedAt: string; dataType: DataType; dataTypeEntity: 'school'
}
export interface Kindergarten {
  id: string; name: string; district: string; street: string; house: string; addressRaw: string; phone: string; director: string
  coordinates: InstitutionCoordinates | null; source: string; updatedAt: string; dataType: DataType; dataTypeEntity: 'kindergarten'
}

export type EducationInstitution = School | Kindergarten

export interface ResidentialBuilding {
  id: string
  district: string | null
  address: string | null
  geometry: EducationGeometry
  centroid: [number, number]
  source: string
  updatedAt: string
}

export interface CoverageAssignment { buildingId: string; institutionId: string; institutionType: EducationInstitutionType; distanceMeters: number }
export interface CoverageZone { institutionId: string; institutionType: EducationInstitutionType; geometry: PolygonGeometry; method: 'nearest' | 'radius'; assignedBuildingsCount: number; coverageLabel: string }
export interface EducationDistrictStats { district: string; schools: number; kindergartens: number; residentialBuildings: number; buildingsPerSchool: number; buildingsPerKindergarten: number }
export interface EducationSourceStatus { key: string; title: string; source: 'runtime' | 'snapshot' | 'cache' | 'mock'; dataType: DataType; status: 'ready' | 'stale' | 'error'; sourceUrl: string; updatedAt: string; fetchedAt: string; message: string }
export interface CoverageConfig { mode: 'nearest' | 'radius'; schoolRadiusMeters: number; kindergartenRadiusMeters: number }
export interface EducationBundle { mode: LiveSourceMode; schools: School[]; kindergartens: Kindergarten[]; buildings: ResidentialBuilding[]; assignments: CoverageAssignment[]; zones: CoverageZone[]; statuses: EducationSourceStatus[] }
