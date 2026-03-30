import { describe, expect, it } from 'vitest'
import {
  formatEducationPlacemarkLabel,
  getEducationMapState,
  selectVisibleEducationLabelIds,
  type GeocodedEducationInstitution,
} from './mapPresentation'

const makeInstitution = (
  id: string,
  coordinates: [number, number],
  overrides: Partial<GeocodedEducationInstitution> = {},
): GeocodedEducationInstitution => ({
  id,
  kind: 'kindergarten',
  name: `Детский сад №${id}`,
  district: 'Центральный',
  street: 'Ленина',
  streetNormalized: 'ленина',
  house: '1',
  address: 'ул. Ленина, 1',
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
  coordinates,
  ...overrides,
})

describe('mapPresentation', () => {
  it('formats compact labels for institutions', () => {
    expect(formatEducationPlacemarkLabel(makeInstitution('123', [55.03, 82.98]))).toBe('Детсад №123')
    expect(
      formatEducationPlacemarkLabel(
        makeInstitution('12', [55.03, 82.98], {
          kind: 'school',
          name: 'Средняя общеобразовательная школа №12',
        }),
      ),
    ).toBe('Школа №12')
  })

  it('always keeps selected institution label visible even on low zoom', () => {
    const institutions = [
      makeInstitution('1', [55.03, 82.98]),
      makeInstitution('2', [55.031, 82.981]),
    ]

    const visible = selectVisibleEducationLabelIds(institutions, 10, '2')

    expect(Array.from(visible)).toEqual(['2'])
  })

  it('declutters nearby labels and limits their amount', () => {
    const institutions = Array.from({ length: 16 }, (_, index) =>
      makeInstitution(String(index), [55.03 + index * 0.0004, 82.98 + index * 0.0004]),
    )

    const visible = selectVisibleEducationLabelIds(institutions, 12)

    expect(visible.size).toBeLessThanOrEqual(8)
  })

  it('computes overview state from visible institutions spread', () => {
    const overview = getEducationMapState([
      makeInstitution('1', [55.01, 82.91]),
      makeInstitution('2', [55.19, 83.12]),
    ])

    expect(overview.center).toEqual([55.1, 83.015])
    expect(overview.zoom).toBe(11)
  })
})
