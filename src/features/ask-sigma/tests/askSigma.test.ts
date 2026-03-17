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
    incidents: [{ id: 'INC-1001', title: 'Авария теплотрассы', subsystem: 'heat', severity: 'критический', status: 'эскалирован', district: 'sov', coordinates: [0, 0], createdAt: '', detectedAt: '', sourceId: 's1', summary: '', description: '', metrics: [], affectedPopulation: 12, linkedRegulationIds: ['r1'], recommendations: [], assignee: 'ЕДДС', deadline: '', progress: 50, timeline: [] }],
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

  it('unknown/help fallback', () => {
    const plan = createPlan(normalizeQuery('абракадабра'))
    const result = executePlan(plan, provider, 'мэр')
    expect(['HELP', 'UNKNOWN']).toContain(result.type)
  })

  it('executor main cases', () => {
    expect(executePlan(createPlan(normalizeQuery('что происходит сейчас')), provider, 'мэр').type).toBe('SUMMARY')
    expect(executePlan(createPlan(normalizeQuery('что требует согласования')), provider, 'мэр').type).toBe('APPROVALS')
    expect(executePlan(createPlan(normalizeQuery('что делать при прорыве теплотрассы')), provider, 'мэр').type).toBe('REGULATION_GUIDANCE')
    expect(executePlan(createPlan(normalizeQuery('сценарий аномальных морозов')), provider, 'мэр').type).toBe('SCENARIO_LOOKUP')
    expect(executePlan(createPlan(normalizeQuery('переведи заместителя по теплу в режим подтверждения')), provider, 'мэр').type).toBe('DEPUTY_MODE_CHANGE')
  })
})
