import type { EducationInstitution } from './types'
import { selectVisibleMapLabelIds } from '../../lib/mapLabelDeclutter'

export type GeocodedEducationInstitution = EducationInstitution & { coordinates: [number, number] }

export const defaultEducationMapState = {
  center: [55.03, 82.98] as [number, number],
  zoom: 10,
} as const

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
): institution is GeocodedEducationInstitution => Array.isArray(institution.coordinates)

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

  const latitudes = institutions.map((institution) => institution.coordinates[0])
  const longitudes = institutions.map((institution) => institution.coordinates[1])
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  const spread = Math.max(maxLat - minLat, maxLng - minLng)

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
