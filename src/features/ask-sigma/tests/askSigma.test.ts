import { describe, expect, it } from 'vitest'
import { normalizeQuery } from '../normalize'
import { stripSafetyWakeWord, stripWakeWord, parseRoleCommand } from '../voice/voiceRegex'
import { routeEntity } from '../router'
import { createPlan } from '../planner'
import { executePlan } from '../executor'
import type { AskSigmaProvider } from '../provider'
import { quickExamplesByRole } from '../suggestedQuestions'
import { buildPublicTransportLink, detectTransportDistrictFilters } from '../transportQuery'

const provider: AskSigmaProvider = {
  getContext: () => ({
    role: 'мэр',
    now: '2026-01-01T00:00:00.000Z',
    incidents: [
      { id: 'INC-1001', title: 'Авария теплотрассы', subsystem: 'heat', severity: 'критический', status: 'эскалирован', district: 'sov', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 12, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'ЕДДС', deadline: '', progress: 50, timeline: [] },
      { id: 'INC-1002', title: 'Сбой на дорожной развязке', subsystem: 'roads', severity: 'высокий', status: 'в работе', district: 'oct', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 18, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'ЦОДД', deadline: '', progress: 40, timeline: [] },
      { id: 'INC-1003', title: 'Недогрев в квартале', subsystem: 'heat', severity: 'высокий', status: 'в работе', district: 'sov', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 9, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'Теплосеть', deadline: '', progress: 30, timeline: [] },
      { id: 'INC-1004', title: 'Отключение электроэнергии на распределительном узле', subsystem: 'utilities', severity: 'критический', status: 'эскалирован', district: 'sov', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 15, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'Горэлектросеть', deadline: '', progress: 25, timeline: [] },
    ],
    regulations: [{ id: 'r1', code: 'РГ-1', title: 'Тепло', domain: 'ЖКХ', version: '1', status: 'активен', sourceDocument: '', sourceClause: '', effectiveFrom: '', parameters: [], recommendationTemplates: [], coverageStatus: 'полное', linkedIncidentTypes: ['heat'] }],
    scenarios: [{ id: 's1', title: 'Аномальные морозы', description: 'desc', serviceLoad: 12, impacts: [{ label: 'x', value: 1 }] }],
    deputies: [{ id: 'd1', name: 'Заместитель по энергетике', domain: 'ЖКХ', mode: 'recommendation', connectedSourceIds: [], activeIncidentIds: [], permissions: [], latestActions: [], constraints: [], escalationRate: 0.1 }],
    servicePerformance: [{ id: 'sp1', service: 'ЕДДС', resolvedInTime: 80, avgMinutes: 10, incidents: 1 }],
    notifications: [{ id: 'n1', text: 'x', level: 'высокий', createdAt: '' }],
  }),
  setDeputyMode: () => undefined,
}

const noTransportProvider: AskSigmaProvider = {
  getContext: () => ({ ...provider.getContext(), publicTransport: { stops: [], fares: [], statuses: [] } }),
}

describe('ask-sigma', () => {
  it('normalize works', () => {
    const q = normalizeQuery('  Ёж, 12!!   ')
    expect(q.normalized).toBe('еж 12')
    expect(q.numbers).toEqual([12])
  })

  it('wake word strip', () => {
    expect(stripWakeWord('Сигма, мэр')).toBe('мэр')
    expect(stripSafetyWakeWord('Сима: диспетчер')).toBe('диспетчер')
  })

  it('role parser with district', () => {
    expect(parseRoleCommand('Сигма, диспетчер Советский район')).toEqual({ role: 'диспетчер', district: 'советский' })
    expect(parseRoleCommand('Сигма, диспетчер Академгородок')).toEqual({ role: 'диспетчер', district: 'советский' })
  })

  it('router detects transport domain', () => {
    const routed = routeEntity(normalizeQuery('какой тариф на автобус в центре'))
    expect(routed.entity).toBe('transport')
  })

  it('planner incident detail', () => {
    const plan = createPlan(normalizeQuery('открой инцидент SIG-1001'))
    expect(plan.operation).toBe('INCIDENT_DETAIL')
    expect(plan.incidentId).toBe('INC-1001')
  })

  it('extracts transport districts and subdistrict mapping', () => {
    const filters = detectTransportDistrictFilters('как проехать из академгородка в дзержинский район')
    expect(filters[0]).toMatchObject({ rawLabel: 'Академгородок', parentDistrict: 'Советский', district: 'Советский' })
    expect(filters[1]).toMatchObject({ district: 'Дзержинский' })
  })

  it('planner maps transport intents', () => {
    expect(createPlan(normalizeQuery('остановки в советском районе')).operation).toBe('TRANSIT_STOPS')
    expect(createPlan(normalizeQuery('какие остановки у маршрута 36')).operation).toBe('TRANSIT_ROUTE_LOOKUP')
    expect(createPlan(normalizeQuery('как проехать из академгородка в дзержинский район')).operation).toBe('TRANSIT_ROUTE_BETWEEN_DISTRICTS')
    expect(createPlan(normalizeQuery('тариф на автобус')).operation).toBe('TRANSIT_FARES')
    expect(createPlan(normalizeQuery('топ транспортных узлов')).operation).toBe('TRANSIT_HUBS')
    expect(createPlan(normalizeQuery('остановки с наибольшим числом маршрутов')).operation).toBe('TRANSIT_HUBS')
  })

  it('district filter is extracted from incident queries', () => {
    const plan = createPlan(normalizeQuery('события в октрябрьском'))
    expect(plan.operation).toBe('FILTER')
    expect(plan.filters?.district).toBe('oct')

    const result = executePlan(plan, provider, 'мэр')
    expect(result.type).toBe('INCIDENT_LIST')
    expect(result.incidents).toHaveLength(1)
    expect(result.incidents?.[0]?.district).toBe('oct')
    expect(result.summary).toContain('Октябрьский')
  })

  it('critical queries return only critical incidents', () => {
    const criticalPlan = createPlan(normalizeQuery('критичные инциденты по энергетике'))
    expect(criticalPlan.operation).toBe('FILTER')
    expect(criticalPlan.filters?.severity).toBe('критический')
    expect(criticalPlan.filters?.subsystem).toBe('energy')

    const criticalResult = executePlan(criticalPlan, provider, 'мэр')
    expect(criticalResult.type).toBe('INCIDENT_LIST')
    expect(criticalResult.incidents).toHaveLength(2)
    expect(criticalResult.incidents?.every((incident) => incident.severity === 'критический')).toBe(true)
    expect(criticalResult.incidents?.some((incident) => incident.subsystem === 'utilities')).toBe(true)

    const criticalVariantPlan = createPlan(normalizeQuery('критические инциденты по энергетике'))
    expect(criticalVariantPlan.filters?.severity).toBe('критический')
    expect(criticalVariantPlan.filters?.subsystem).toBe('energy')

    const criticalVariantResult = executePlan(criticalVariantPlan, provider, 'мэр')
    expect(criticalVariantResult.type).toBe('INCIDENT_LIST')
    expect(criticalVariantResult.incidents).toHaveLength(2)
    expect(criticalVariantResult.incidents?.every((incident) => incident.severity === 'критический')).toBe(true)
    expect(criticalVariantResult.incidents?.some((incident) => incident.subsystem === 'utilities')).toBe(true)
  })

  it('executor supports district filtering and implicit district context', () => {
    const explicit = executePlan(createPlan(normalizeQuery('остановки в ленинском районе')), provider, 'мэр', { implicitDistrict: 'Советский' })
    expect(explicit.type).toBe('TRANSIT_STOPS')
    expect(explicit.appliedDistrictFilter?.source).toBe('explicit')

    const implicitPlan = createPlan(normalizeQuery('остановки с павильоном'))
    const implicit = executePlan(implicitPlan, provider, 'мэр', { implicitDistrict: 'Советский' })
    expect(implicit.type).toBe('TRANSIT_STOPS')
    expect(implicit.appliedDistrictFilter?.source).toBe('implicit')
  })

  it('executor supports route intersection between districts', () => {
    const plan = createPlan(normalizeQuery('сколько общих маршрутов между советским и центральным районами'))
    const result = executePlan(plan, provider, 'мэр')
    expect(result.type).toBe('TRANSIT_ROUTE_BETWEEN_DISTRICTS')
    expect(result.transportRouteBetweenDistricts?.count).toBeGreaterThan(0)
  })

  it('fallback for missing live transport data', () => {
    const result = executePlan(createPlan(normalizeQuery('общественный транспорт')), noTransportProvider, 'мэр')
    expect(result.type).toBe('PUBLIC_TRANSPORT_SUMMARY')
    expect(result.summary).toContain('Показываю последний сохраненный снимок')
  })

  it('quick examples include transport prompts by role', () => {
    expect(quickExamplesByRole.мэр).toEqual(['Что ты умеешь?', 'Что происходит в энергетике?', 'События в советском районе', 'Остановки с наибольшим числом маршрутов'])
    expect(quickExamplesByRole.диспетчер).toEqual(['Что ты умеешь?', 'Что происходит в энергетике?', 'События в советском районе', 'Остановки с наибольшим числом маршрутов'])
    expect(quickExamplesByRole.аналитик).toEqual(['Что ты умеешь?', 'Что происходит в энергетике?', 'События в советском районе', 'Остановки с наибольшим числом маршрутов'])
  })

  it('deep-link generation for /public-transport', () => {
    const link = buildPublicTransportLink({ district: 'Советский', route: '36', pavilionOnly: true, focus: 'map' })
    expect(link).toContain('/public-transport?')
    expect(link).toContain('district=%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D1%81%D0%BA%D0%B8%D0%B9')
    expect(link).toContain('route=36')
    expect(link).toContain('pavilionOnly=true')
    expect(link).toContain('focus=map')
  })

  it('unknown/help fallback', () => {
    const unknownPlan = createPlan(normalizeQuery('абракадабра'))
    expect(unknownPlan.operation).toBe('UNKNOWN')

    const unknownResult = executePlan(unknownPlan, provider, 'мэр')
    expect(unknownResult.type).toBe('UNKNOWN')

    const helpPlan = createPlan(normalizeQuery('что умеет сигма'))
    expect(helpPlan.operation).toBe('HELP')

    const helpResult = executePlan(helpPlan, provider, 'мэр')
    expect(helpResult.type).toBe('HELP')
    expect(helpResult.summary).toContain('По транспорту можно спрашивать')
    expect(helpResult.hints).toEqual([
      expect.objectContaining({ question: 'что происходит сейчас' }),
      expect.objectContaining({ question: 'сводка за 24 часа' }),
      expect.objectContaining({ question: 'критичные инциденты по энергетике' }),
      expect.objectContaining({ question: 'события в кировском районе' }),
      expect.objectContaining({ question: 'инциденты по шуму' }),
      expect.objectContaining({ question: 'сколько общих маршрутов между советским и центральным районами' }),
      expect.objectContaining({ question: 'какие районы лучше всего покрыты транспортом' }),
    ])
  })
})
