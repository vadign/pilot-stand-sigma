import type { EducationInstitution } from './types'
import { selectVisibleMapLabelIds } from '../../lib/mapLabelDeclutter'
import { isEducationCoordinateWithinNovosibirsk } from './coordinateBounds'

export type GeocodedEducationInstitution = EducationInstitution & { coordinates: [number, number] }

export const defaultEducationMapState = {
  center: [55.03, 82.98] as [number, number],
  zoom: 10,
} as const

const getQuantile = (values: number[], quantile: number): number => {
  const sortedValues = [...values].sort((left, right) => left - right)
  const index = (sortedValues.length - 1) * quantile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const weight = index - lowerIndex

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight
}

const getInstitutionBounds = (institutions: GeocodedEducationInstitution[]) => {
  const latitudes = institutions.map((institution) => institution.coordinates[0])
  const longitudes = institutions.map((institution) => institution.coordinates[1])
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    spread: Math.max(maxLat - minLat, maxLng - minLng),
  }
}

const selectOverviewInstitutions = (institutions: GeocodedEducationInstitution[]) => {
  if (institutions.length < 6) return institutions

  const latitudes = institutions.map((institution) => institution.coordinates[0])
  const longitudes = institutions.map((institution) => institution.coordinates[1])
  const latQ1 = getQuantile(latitudes, 0.25)
  const latQ3 = getQuantile(latitudes, 0.75)
  const lngQ1 = getQuantile(longitudes, 0.25)
  const lngQ3 = getQuantile(longitudes, 0.75)
  const latMargin = Math.max((latQ3 - latQ1) * 1.5, 0.01)
  const lngMargin = Math.max((lngQ3 - lngQ1) * 1.5, 0.01)

  const robustInstitutions = institutions.filter((institution) => {
    const [lat, lng] = institution.coordinates
    return (
      lat >= latQ1 - latMargin
      && lat <= latQ3 + latMargin
      && lng >= lngQ1 - lngMargin
      && lng <= lngQ3 + lngMargin
    )
  })

  if (robustInstitutions.length < Math.max(4, Math.ceil(institutions.length * 0.7))) {
    return institutions
  }

  const fullBounds = getInstitutionBounds(institutions)
  const robustBounds = getInstitutionBounds(robustInstitutions)

  return robustBounds.spread <= fullBounds.spread * 0.85 ? robustInstitutions : institutions
}

const getInstitutionLabel = (institution: EducationInstitution): string => {
  const numberMatch = institution.name.match(/№\s*([A-Za-zА-Яа-я0-9-]+)/)
  const baseLabel = institution.kind === 'school' ? 'Школа' : 'Детсад'

  if (numberMatch) return `${baseLabel} №${numberMatch[1]}`

  const compactName = institution.name
    .replace(/^муниципальное бюджетное/i, '')
    .replace(/^муниципальное автономное/i, '')
    .replace(/^общеобразовательное учреждение/i, '')
    .replace(/^дошкольное образовательное учреждение/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return compactName.length <= 20 ? compactName : `${baseLabel}`
}

export const hasInstitutionCoordinates = (
  institution: EducationInstitution,
): institution is GeocodedEducationInstitution =>
  isEducationCoordinateWithinNovosibirsk(institution.coordinates)

export const formatEducationPlacemarkLabel = (institution: EducationInstitution): string =>
  getInstitutionLabel(institution)

export const getEducationMapState = (
  institutions: GeocodedEducationInstitution[],
): { center: [number, number]; zoom: number } => {
  if (institutions.length === 0) return { ...defaultEducationMapState }

  if (institutions.length === 1) {
    return {
      center: institutions[0].coordinates,
      zoom: 14,
    }
  }

  const overviewInstitutions = selectOverviewInstitutions(institutions)
  const { minLat, maxLat, minLng, maxLng, spread } = getInstitutionBounds(overviewInstitutions)

  let zoom = 14
  if (spread > 0.75) zoom = 9
  else if (spread > 0.35) zoom = 10
  else if (spread > 0.18) zoom = 11
  else if (spread > 0.08) zoom = 12
  else if (spread > 0.03) zoom = 13

  return {
    center: [
      Number(((minLat + maxLat) / 2).toFixed(6)),
      Number(((minLng + maxLng) / 2).toFixed(6)),
    ] as [number, number],
    zoom,
  }
}

export const selectVisibleEducationLabelIds = (
  institutions: GeocodedEducationInstitution[],
  zoom: number,
  selectedInstitutionId?: string | null,
): Set<string> => {
  return selectVisibleMapLabelIds(institutions, zoom, {
    selectedId: selectedInstitutionId,
    minZoom: 12,
    getPriority: (institution) => (institution.kind === 'school' ? 2 : 1),
  })
}
