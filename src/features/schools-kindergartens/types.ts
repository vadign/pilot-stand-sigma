export type EducationInstitutionKind = 'school' | 'kindergarten'
export type EducationKindFilter = 'all' | EducationInstitutionKind

export interface EducationSourceInfo {
  kind: EducationInstitutionKind
  url: string
  records: number
}

export interface EducationInstitution {
  id: string
  kind: EducationInstitutionKind
  name: string
  district: string
  street: string
  streetNormalized: string
  house: string
  address: string
  phone: string | null
  site: string | null
  email: string | null
  headName: string | null
  headRole: string | null
  headPhone: string | null
  workingHours: string | null
  groups: string | null
  capacity: number | null
  services: string | null
  additionalInfo: string | null
  equipment: string | null
  specialists: string | null
  sports: string | null
  coordinates: [number, number] | null
}

export interface EducationSnapshot {
  generatedAt: string
  city: string
  sourceType: string
  sourceUrls: EducationSourceInfo[]
  districts: string[]
  counts: {
    schools: number
    kindergartens: number
    geocoded: number
    total: number
  }
  institutions: EducationInstitution[]
}

export interface EducationDistrictStat {
  district: string
  total: number
  schoolCount: number
  kindergartenCount: number
  kindergartenCapacity: number
  geocodedCount: number
}
