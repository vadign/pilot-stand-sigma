import { describe, expect, it } from 'vitest'
import { normalizeQuery } from '../normalize'
import { createPlan } from '../planner'
import { executePlan } from '../executor'
import type { AskSigmaProvider } from '../provider'

const provider: AskSigmaProvider = {
  getContext: () => ({
    role: 'мэр',
    now: '2026-03-22T08:00:00.000Z',
    incidents: [],
    regulations: [],
    scenarios: [{ id: 's1', title: 'Storm', description: 'desc', serviceLoad: 2, impacts: [{ label: 'x', value: 1 }] }],
    deputies: [{ id: 'd1', name: 'Заместитель', domain: 'ЖКХ', mode: 'recommendation', connectedSourceIds: [], activeIncidentIds: [], permissions: [], latestActions: [], constraints: [], escalationRate: 0.1 }],
    servicePerformance: [],
    notifications: [],
    liveSummary: { totalHouses: 10, plannedHouses: 6, emergencyHouses: 4, activeIncidents: 3, topDistricts: [], utilities: [] },
    constructionAggregates: [{ districtId: 'sov', districtName: 'Советский', permits: 2, commissioned: 1, activeConstruction: 1 }],
    sourceStatuses: [{ id: 'source-openmeteo-air', name: 'Open-Meteo Air', kind: 'api', ttlMs: 900000, sourceUrls: ['https://example.test'], license: 'CC', refreshMode: 'hybrid', dataCategory: 'real', supportsHistory: true, supportsMap: true, supportsAskSigma: true, status: 'ready', enabled: true, directions: ['ecology'], origin: 'snapshot', message: 'ok', lastUpdated: '2026-03-22T08:00:00.000Z' }],
    indicators: [
      { id: 'aqi', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'AQI', metric: 'aqi', value: 77, unit: 'индекс', dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
      { id: 'pm25', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'PM2.5', metric: 'pm25', value: 38, unit: 'µg/m³', dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
      { id: 'temp', sourceId: 'source-openmeteo-weather', direction: 'ecology', label: 'Температура', metric: 'temperature', value: -14, unit: '°C', dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
      { id: 'wind', sourceId: 'source-openmeteo-weather', direction: 'roads', label: 'Ветер', metric: 'wind_speed', value: 1.8, unit: 'м/с', dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
    ],
    riskCards: [{ id: 'risk-1', title: 'Смоговая ловушка', direction: 'ecology', severity: 'высокий', sourceIds: ['source-openmeteo-air'], dataType: 'calculated', triggeredAt: '2026-03-22T08:00:00.000Z', explanation: { ruleId: 'smog_trap', title: 'Rule', because: ['Ветер слабый', 'PM2.5 высокий'] }, metrics: [] }],
    trafficIndex: [{ id: 't1', districtId: 'sov', districtName: 'Советский', score: 71, level: 'high', factors: [], dataType: 'calculated', sourceId: 'source-traffic-index', updatedAt: '2026-03-22T08:00:00.000Z' }],
    transitRoutes: [{ id: 'r1', fromDistrictId: 'sov', toDistrictId: 'oct', summary: 'Через центр', stopIds: ['1', '2'], commonRouteNames: ['8'], score: 0.7, sourceId: 'source-opendata-stops', updatedAt: '2026-03-22T08:00:00.000Z' }],
    referenceObjects: [
      { id: 'camera-1', sourceId: 'source-overpass-cameras', direction: 'safety', category: 'camera', title: 'Камера', districtId: 'len', districtName: 'Ленинский', coordinates: [0, 0], dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
      { id: 'medical-1', sourceId: 'source-overpass-medical', direction: 'medical', category: 'medical', title: 'Больница', districtId: 'sov', districtName: 'Советский', coordinates: [0, 0], dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
      { id: 'school-1', sourceId: 'source-opendata-schools', direction: 'education', category: 'school', title: 'Школа', districtId: 'sov', districtName: 'Советский', coordinates: [0, 0], dataType: 'real', updatedAt: '2026-03-22T08:00:00.000Z' },
    ],
  }),
  setDeputyMode: () => undefined,
}

describe('ask sigma new intents', () => {
  it('routes ecology queries', () => {
    const plan = createPlan(normalizeQuery('качество воздуха в городе'))
    expect(plan.operation).toBe('ECO_STATUS')
    const result = executePlan(plan, provider, 'мэр')
    expect(result.type).toBe('ECOLOGY_STATUS')
  })

  it('routes traffic queries', () => {
    const plan = createPlan(normalizeQuery('индекс дорожной нагрузки'))
    expect(plan.operation).toBe('TRAFFIC_INDEX')
    const result = executePlan(plan, provider, 'мэр')
    expect(result.type).toBe('TRAFFIC_INDEX')
    expect(result.trafficIndex?.[0]?.dataType).toBe('calculated')
  })

  it('routes cameras, medical and directory queries', () => {
    expect(executePlan(createPlan(normalizeQuery('камеры в ленинском районе')), provider, 'мэр').type).toBe('REFERENCE_MAP')
    expect(executePlan(createPlan(normalizeQuery('больницы в районе')), provider, 'мэр').type).toBe('REFERENCE_MAP')
    expect(executePlan(createPlan(normalizeQuery('школы в советском районе')), provider, 'мэр').type).toBe('DIRECTORY_LIST')
  })
})
