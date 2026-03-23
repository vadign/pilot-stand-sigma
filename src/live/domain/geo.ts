import { getDistrictName } from '../../lib/districts'
import type { SigmaDistrictBoundary, SigmaIndicator, SigmaReferenceObject, SigmaRiskCard, SigmaTransitRoute } from '../types'

export const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export const classifyDistrictByPoint = (point: [number, number], boundaries: SigmaDistrictBoundary[]): { districtId?: string; districtName?: string; quality: 'polygon' | 'centroid-fallback' } => {
  const polygonMatch = boundaries.find((boundary) => isPointInPolygon(point, boundary.polygon))
  if (polygonMatch) return { districtId: polygonMatch.id, districtName: polygonMatch.name, quality: 'polygon' }

  const nearest = boundaries
    .map((boundary) => ({ boundary, distance: Math.hypot(boundary.centroid[0] - point[0], boundary.centroid[1] - point[1]) }))
    .sort((left, right) => left.distance - right.distance)[0]?.boundary

  return nearest ? { districtId: nearest.id, districtName: nearest.name, quality: 'centroid-fallback' } : { quality: 'centroid-fallback' }
}

export const buildEcologyRiskCards = (indicators: SigmaIndicator[], districtId = 'city'): SigmaRiskCard[] => {
  const pm25 = indicators.find((item) => item.metric === 'pm25')?.value ?? 0
  const wind = indicators.find((item) => item.metric === 'wind_speed')?.value ?? 0
  const temperature = indicators.find((item) => item.metric === 'temperature')?.value ?? 0
  const cards: SigmaRiskCard[] = []
  const now = indicators[0]?.updatedAt ?? new Date().toISOString()

  if (wind <= 2.5 && pm25 >= 35) {
    cards.push({
      id: 'risk-smog-trap',
      title: 'Смоговая ловушка',
      direction: 'ecology',
      severity: 'высокий',
      districtId,
      districtName: districtId === 'city' ? 'Город' : getDistrictName(districtId),
      sourceIds: ['source-openmeteo-air', 'source-openmeteo-weather'],
      dataType: 'calculated',
      triggeredAt: now,
      explanation: { ruleId: 'smog_trap', title: 'Слабый ветер + высокий PM2.5', because: [`Ветер ${wind} м/с ≤ 2.5`, `PM2.5 ${pm25} µg/m³ ≥ 35`] },
      metrics: [{ label: 'PM2.5', value: `${pm25} µg/m³` }, { label: 'Ветер', value: `${wind} м/с` }],
    })
  }

  if (pm25 >= 35) {
    cards.push({
      id: 'risk-pm25',
      title: 'Превышение PM2.5',
      direction: 'ecology',
      severity: pm25 >= 55 ? 'критический' : 'высокий',
      districtId,
      districtName: districtId === 'city' ? 'Город' : getDistrictName(districtId),
      sourceIds: ['source-openmeteo-air'],
      dataType: 'calculated',
      triggeredAt: now,
      explanation: { ruleId: 'pm25_threshold', title: 'Превышен порог PM2.5', because: [`PM2.5 ${pm25} µg/m³ ≥ 35`] },
      metrics: [{ label: 'PM2.5', value: `${pm25} µg/m³` }],
    })
  }

  if (temperature <= -12) {
    cards.push({
      id: 'risk-cold',
      title: 'Экстремальный холод',
      direction: 'ecology',
      severity: temperature <= -25 ? 'критический' : 'высокий',
      districtId,
      districtName: districtId === 'city' ? 'Город' : getDistrictName(districtId),
      sourceIds: ['source-openmeteo-weather'],
      dataType: 'calculated',
      triggeredAt: now,
      explanation: { ruleId: 'extreme_cold', title: 'Низкая температура воздуха', because: [`Температура ${temperature} °C ≤ -12`] },
      metrics: [{ label: 'Температура', value: `${temperature} °C` }],
    })
  }

  return cards
}

export const buildDistrictTransitRoutes = (stops: SigmaReferenceObject[]): SigmaTransitRoute[] => {
  const grouped = new Map<string, SigmaReferenceObject[]>()
  stops.filter((item) => item.category === 'stop').forEach((stop) => {
    const districtId = stop.districtId ?? 'unknown'
    grouped.set(districtId, [...(grouped.get(districtId) ?? []), stop])
  })

  const sov = grouped.get('sov')?.[0]
  const oct = grouped.get('oct')?.[0]
  return sov && oct ? [{
    id: 'route-sov-oct',
    fromDistrictId: 'sov',
    toDistrictId: 'oct',
    summary: 'Маршрут через общие остановки и пересадку на центральный коридор',
    stopIds: [sov.id, oct.id],
    commonRouteNames: ['8', '15'],
    score: 0.74,
    sourceId: 'source-opendata-stops',
    updatedAt: sov.updatedAt,
  }] : []
}
