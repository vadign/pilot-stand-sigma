import { describe, expect, it } from 'vitest'
import type { Incident } from '../types'
import { getIncidentMapPresentation } from './incidentMapPresentation'

const baseIncident: Incident = {
  id: 'INC-1001',
  title: 'Падение давления на магистрали',
  subsystem: 'heat',
  severity: 'критический',
  status: 'эскалирован',
  district: 'sov',
  coordinates: [54.86, 83.09],
  createdAt: '2026-03-24T09:00:00.000Z',
  detectedAt: '2026-03-24T09:15:00.000Z',
  sourceId: 's1',
  summary: 'Требуется проверка резервной ветки и контроль температуры подачи.',
  description: 'Описание',
  metrics: [],
  affectedPopulation: 1000,
  linkedRegulationIds: [],
  recommendations: [],
  assignee: 'ЕДДС',
  deadline: '2026-03-25T09:00:00.000Z',
  progress: 20,
  timeline: [],
}

describe('getIncidentMapPresentation', () => {
  it('formats mock incidents in readable Russian', () => {
    const presentation = getIncidentMapPresentation(baseIncident)

    expect(presentation.caption).toContain('Падение давления')
    expect(presentation.bodyRows).toEqual(expect.arrayContaining([
      { label: 'Район', value: 'Советский' },
      { label: 'Подсистема', value: 'Энергетика' },
      { label: 'Источник', value: 'ЕДДС 051' },
    ]))
    expect(presentation.bodyRows.some((row) => row.value.includes('INC-1001'))).toBe(false)
  })

  it('formats live outages without raw english keys', () => {
    const presentation = getIncidentMapPresentation({
      ...baseIncident,
      id: '051-sov-emergency-heating-0',
      title: '051-sov-emergency-heating-0',
      sourceId: 'live-051',
      sourceBadge: '051',
      liveMeta: {
        outageKind: 'emergency',
        utilityType: 'heating',
      },
    })

    expect(presentation.title).toBe('Экстренное отключение отопления')
    expect(presentation.caption).toBe('Экстр. отопление')
    expect(presentation.bodyRows).toEqual(expect.arrayContaining([
      { label: 'Тип события', value: 'Экстренное отключение' },
      { label: 'Ресурс', value: 'отопление' },
      { label: 'Источник', value: '051 Новосибирск' },
    ]))
    expect(presentation.bodyRows.some((row) => /emergency|heating|051-sov/i.test(row.value))).toBe(false)
  })
})
