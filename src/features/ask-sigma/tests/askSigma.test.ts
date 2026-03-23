import { describe, expect, it } from 'vitest'
import { normalizeQuery } from '../normalize'
import { stripSafetyWakeWord, stripWakeWord, parseRoleCommand } from '../voice/voiceRegex'
import { routeEntity } from '../router'
import { createPlan } from '../planner'
import { executePlan } from '../executor'
import type { AskSigmaProvider } from '../provider'

const provider: AskSigmaProvider = {
  getContext: () => ({
    role: 'мэр',
    now: '2026-01-01T00:00:00.000Z',
    incidents: [
      { id: 'INC-1001', title: 'Авария теплотрассы', subsystem: 'heat', severity: 'критический', status: 'эскалирован', district: 'sov', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 12, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'ЕДДС', deadline: '', progress: 50, timeline: [] },
      { id: 'INC-1002', title: 'Сбой на дорожной развязке', subsystem: 'roads', severity: 'высокий', status: 'в работе', district: 'oct', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 18, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'ЦОДД', deadline: '', progress: 40, timeline: [] },
    ],
    regulations: [{ id: 'r1', code: 'РГ-1', title: 'Тепло', domain: 'ЖКХ', version: '1', status: 'активен', sourceDocument: '', sourceClause: '', effectiveFrom: '', parameters: [], recommendationTemplates: [], coverageStatus: 'полное', linkedIncidentTypes: ['heat'] }],
    scenarios: [{ id: 's1', title: 'Аномальные морозы', description: 'desc', serviceLoad: 12, impacts: [{ label: 'x', value: 1 }] }],
    deputies: [{ id: 'd1', name: 'Заместитель по теплоснабжению', domain: 'ЖКХ', mode: 'recommendation', connectedSourceIds: [], activeIncidentIds: [], permissions: [], latestActions: [], constraints: [], escalationRate: 0.1 }],
    servicePerformance: [{ id: 'sp1', service: 'ЕДДС', resolvedInTime: 80, avgMinutes: 10, incidents: 1 }],
    notifications: [{ id: 'n1', text: 'x', level: 'высокий', createdAt: '' }],
  }),
  setDeputyMode: () => undefined,
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

  it('router entity', () => {
    const routed = routeEntity(normalizeQuery('критичные инциденты по отоплению'))
    expect(routed.entity).toBe('incident')
    expect(routed.subsystem).toBe('heating')
  })

  it('planner incident detail', () => {
    const plan = createPlan(normalizeQuery('открой инцидент SIG-1001'))
    expect(plan.operation).toBe('INCIDENT_DETAIL')
    expect(plan.incidentId).toBe('INC-1001')
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

  it('soviet district is available by sovetsky and akademgorodok aliases', () => {
    const sovPlan = createPlan(normalizeQuery('события в советском районе'))
    expect(sovPlan.operation).toBe('FILTER')
    expect(sovPlan.filters?.district).toBe('sov')

    const akademPlan = createPlan(normalizeQuery('события в академгородке'))
    expect(akademPlan.operation).toBe('FILTER')
    expect(akademPlan.filters?.district).toBe('sov')

    const result = executePlan(akademPlan, provider, 'мэр')
    expect(result.type).toBe('INCIDENT_LIST')
    expect(result.incidents).toHaveLength(1)
    expect(result.incidents?.[0]?.district).toBe('sov')
    expect(result.summary).toContain('Академгородок')
  })

  it('unknown/help fallback', () => {
    const unknownPlan = createPlan(normalizeQuery('абракадабра'))
    expect(unknownPlan.operation).toBe('UNKNOWN')

    const unknownResult = executePlan(unknownPlan, provider, 'мэр')
    expect(unknownResult.type).toBe('UNKNOWN')
    expect(unknownResult.title).toBe('Сигма пока не знает эту тему')
    expect(unknownResult.hints).toContainEqual({
      question: 'что происходит сейчас',
      description: 'общая оперативная обстановка, число активных и критичных событий.',
    })
    expect(unknownResult.hints).toContainEqual({
      question: 'события в кировском районе',
      description: 'поиск и фильтрация событий по конкретному району города.',
    })

    const helpPlan = createPlan(normalizeQuery('что умеет сигма'))
    expect(helpPlan.operation).toBe('HELP')

    const directHelpPlan = createPlan(normalizeQuery('что ты умеешь'))
    expect(directHelpPlan.operation).toBe('HELP')
  })


  it('supports public transport queries', () => {
    const summary = executePlan(createPlan(normalizeQuery('общественный транспорт')), provider, 'мэр')
    expect(summary.type).toBe('PUBLIC_TRANSPORT_SUMMARY')

    const stops = executePlan(createPlan(normalizeQuery('остановки в советском районе')), provider, 'мэр')
    expect(stops.type).toBe('TRANSIT_STOPS')
    expect(stops.transportStops?.length).toBeGreaterThan(0)

    const fares = executePlan(createPlan(normalizeQuery('какой тариф на автобус')), provider, 'мэр')
    expect(fares.type).toBe('TRANSIT_FARES')

    const route = executePlan(createPlan(normalizeQuery('какие остановки у маршрута 36')), provider, 'мэр')
    expect(route.type).toBe('TRANSIT_ROUTE_LOOKUP')

    const compare = executePlan(createPlan(normalizeQuery('сколько общих маршрутов между советским и центральным')), provider, 'мэр')
    expect(compare.type).toBe('TRANSIT_DISTRICT_COMPARE')
    expect(compare.districtCompare?.count).toBeGreaterThan(0)
  })

  it('executor main cases', () => {
    expect(executePlan(createPlan(normalizeQuery('что происходит сейчас')), provider, 'мэр').type).toBe('SUMMARY')
    expect(executePlan(createPlan(normalizeQuery('что происходит сейчас в октрябрьском')), provider, 'мэр').summary).toContain('Октябрьский')
    expect(executePlan(createPlan(normalizeQuery('что происходит сейчас в академгородке')), provider, 'мэр').summary).toContain('Академгородок')
    expect(executePlan(createPlan(normalizeQuery('что требует согласования')), provider, 'мэр').type).toBe('APPROVALS')
    expect(executePlan(createPlan(normalizeQuery('что делать при прорыве теплотрассы')), provider, 'мэр').type).toBe('REGULATION_GUIDANCE')
    expect(executePlan(createPlan(normalizeQuery('сценарий аномальных морозов')), provider, 'мэр').type).toBe('SCENARIO_LOOKUP')
    expect(executePlan(createPlan(normalizeQuery('переведи заместителя по теплу в режим подтверждения')), provider, 'мэр').type).toBe('DEPUTY_MODE_CHANGE')
  })
})
