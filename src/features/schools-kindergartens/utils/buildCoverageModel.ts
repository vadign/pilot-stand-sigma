import type { CoverageAssignment, CoverageConfig, CoverageZone, EducationInstitution, EducationInstitutionType, ResidentialBuilding } from '../types'

const toRadians = (value: number) => (value * Math.PI) / 180

const distanceMeters = (left: [number, number], right: [number, number]) => {
  const earthRadius = 6_371_000
  const dLat = toRadians(right[0] - left[0])
  const dLon = toRadians(right[1] - left[1])
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(left[0])) * Math.cos(toRadians(right[0])) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const buildBBoxPolygon = (points: [number, number][]) => {
  const lats = points.map((p) => p[0])
  const lons = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  return {
    type: 'Polygon' as const,
    coordinates: [[
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ]],
  }
}

const zoneMethodLabel = (mode: CoverageConfig['mode']) => mode === 'nearest' ? 'Nearest facility approximation' : 'Radius approximation'

export const buildCoverageModel = (
  institutions: EducationInstitution[],
  buildings: ResidentialBuilding[],
  institutionType: EducationInstitutionType,
  config: CoverageConfig,
): { assignments: CoverageAssignment[]; zones: CoverageZone[] } => {
  const candidates = institutions.filter((item) => item.dataTypeEntity === institutionType && item.coordinates)
  const assignments: CoverageAssignment[] = []

  for (const building of buildings) {
    let best: { id: string; distance: number } | undefined

    for (const institution of candidates) {
      const dist = distanceMeters(building.centroid, [institution.coordinates!.lat, institution.coordinates!.lon])
      if (config.mode === 'radius') {
        const radius = institutionType === 'school' ? config.schoolRadiusMeters : config.kindergartenRadiusMeters
        if (dist > radius) continue
      }
      if (!best || dist < best.distance) best = { id: institution.id, distance: dist }
    }

    if (!best) continue
    assignments.push({ buildingId: building.id, institutionId: best.id, institutionType, distanceMeters: best.distance })
  }

  const zones = candidates.map((institution) => {
    const assignedPoints = assignments
      .filter((item) => item.institutionId === institution.id)
      .map((item) => buildings.find((b) => b.id === item.buildingId)?.centroid)
      .filter((item): item is [number, number] => Boolean(item))

    const basePoint: [number, number] = [institution.coordinates!.lat, institution.coordinates!.lon]
    const geometry = buildBBoxPolygon(assignedPoints.length > 2 ? assignedPoints : [basePoint, [basePoint[0] + 0.002, basePoint[1] + 0.002]])

    return {
      institutionId: institution.id,
      institutionType,
      geometry,
      method: config.mode,
      assignedBuildingsCount: assignedPoints.length,
      coverageLabel: `${zoneMethodLabel(config.mode)} · Approximate model`,
    } satisfies CoverageZone
  })

  return { assignments, zones }
}
