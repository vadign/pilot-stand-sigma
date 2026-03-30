export const NOVOSIBIRSK_EDUCATION_COORDINATE_BOUNDS = {
  minLat: 54.75,
  maxLat: 55.25,
  minLng: 82.75,
  maxLng: 83.2,
} as const

export const isEducationCoordinateWithinNovosibirsk = (
  coordinates: [number, number] | null | undefined,
): coordinates is [number, number] => {
  if (!Array.isArray(coordinates)) return false

  const [lat, lng] = coordinates
  return (
    lat >= NOVOSIBIRSK_EDUCATION_COORDINATE_BOUNDS.minLat
    && lat <= NOVOSIBIRSK_EDUCATION_COORDINATE_BOUNDS.maxLat
    && lng >= NOVOSIBIRSK_EDUCATION_COORDINATE_BOUNDS.minLng
    && lng <= NOVOSIBIRSK_EDUCATION_COORDINATE_BOUNDS.maxLng
  )
}
