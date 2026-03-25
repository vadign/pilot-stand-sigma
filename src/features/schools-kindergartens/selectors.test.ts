import { describe, expect, it } from 'vitest'
import { buildEducationDistrictStats, filterEducationInstitutions, searchEducationInstitutions } from './selectors'
import type { EducationInstitution } from './types'

const baseInstitution: EducationInstitution = {
  id: 'school-1',
  kind: 'school',
  name: 'Школа',
  district: 'Советский район',
  street: 'Академическая улица',
  streetNormalized: 'улица Академическая',
  house: '1',
  address: 'улица Академическая, 1, Советский район, Новосибирск',
  phone: null,
  site: null,
  email: null,
  headName: null,
  headRole: null,
  headPhone: null,
  workingHours: null,
  groups: null,
  capacity: null,
  services: null,
  additionalInfo: null,
  equipment: null,
  specialists: null,
  sports: null,
  coordinates: [54.86, 83.09],
}

describe('schools-kindergartens selectors', () => {
  it('filters institutions by district and kind', () => {
    const institutions: EducationInstitution[] = [
      { ...baseInstitution, id: 'school-1', kind: 'school', district: 'Советский район' },
      { ...baseInstitution, id: 'kg-1', kind: 'kindergarten', district: 'Советский район' },
      { ...baseInstitution, id: 'school-2', kind: 'school', district: 'Ленинский район' },
    ]

    expect(filterEducationInstitutions(institutions, 'Советский район', 'all').map((item) => item.id)).toEqual(['school-1', 'kg-1'])
    expect(filterEducationInstitutions(institutions, '', 'school').map((item) => item.id)).toEqual(['school-1', 'school-2'])
  })

  it('builds district stats with kindergarten capacity and geocoded counts', () => {
    const institutions: EducationInstitution[] = [
      { ...baseInstitution, id: 'school-1', kind: 'school', district: 'Советский район', coordinates: [54.86, 83.09] },
      { ...baseInstitution, id: 'kg-1', kind: 'kindergarten', district: 'Советский район', capacity: 240, coordinates: [54.861, 83.091] },
      { ...baseInstitution, id: 'kg-2', kind: 'kindergarten', district: 'Ленинский район', capacity: 180, coordinates: null },
    ]

    expect(buildEducationDistrictStats(institutions)).toEqual([
      {
        district: 'Советский район',
        total: 2,
        schoolCount: 1,
        kindergartenCount: 1,
        kindergartenCapacity: 240,
        geocodedCount: 2,
      },
      {
        district: 'Ленинский район',
        total: 1,
        schoolCount: 0,
        kindergartenCount: 1,
        kindergartenCapacity: 180,
        geocodedCount: 0,
      },
    ])
  })

  it('searches institutions by name, district and address', () => {
    const institutions: EducationInstitution[] = [
      { ...baseInstitution, id: 'school-1', name: 'Школа №1', district: 'Советский район', address: 'улица Академическая, 1, Советский район, Новосибирск' },
      { ...baseInstitution, id: 'kg-1', kind: 'kindergarten', name: 'Детский сад Ромашка', district: 'Ленинский район', address: 'улица Титова, 10, Ленинский район, Новосибирск' },
    ]

    expect(searchEducationInstitutions(institutions, 'ромашка').map((item) => item.id)).toEqual(['kg-1'])
    expect(searchEducationInstitutions(institutions, 'ленинский').map((item) => item.id)).toEqual(['kg-1'])
    expect(searchEducationInstitutions(institutions, 'академическая, 1').map((item) => item.id)).toEqual(['school-1'])
  })
})
