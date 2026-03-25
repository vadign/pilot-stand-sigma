import { describe, expect, it } from 'vitest'
import type { Incident } from '../types'
import { selectTopIncidentsByHouses } from './selectTopIncidentsByHouses'

const baseIncident: Incident = {
  id: 'INC-1',
  title: 'Incident',
  subsystem: 'heat',
  severity: 'средний',
  status: 'новый',
  district: 'sov',
  coordinates: [54.86, 83.09],
  createdAt: '2026-03-25T00:00:00.000Z',
  detectedAt: '2026-03-25T00:00:00.000Z',
  sourceId: 's1',
  summary: 'summary',
  description: 'description',
  metrics: [],
  affectedPopulation: 0,
  linkedRegulationIds: [],
  recommendations: [],
  assignee: 'ЕДДС',
  deadline: '2026-03-25T01:00:00.000Z',
  progress: 0,
  timeline: [],
}

describe('selectTopIncidentsByHouses', () => {
  it('keeps only the largest live incidents by house count', () => {
    const incidents = Array.from({ length: 10 }, (_, index) => ({
      ...baseIncident,
      id: `051-${index + 1}`,
      detail: { houses: index + 1 },
      liveMeta: { raw: { houses: index + 1 } },
    }))

    const result = selectTopIncidentsByHouses(incidents, 7)

    expect(result).toHaveLength(7)
    expect(result.map((item) => item.id)).toEqual(['051-10', '051-9', '051-8', '051-7', '051-6', '051-5', '051-4'])
  })

  it('leaves the input untouched when incidents have no house counts', () => {
    const incidents = [
      { ...baseIncident, id: 'INC-1' },
      { ...baseIncident, id: 'INC-2' },
    ]

    const result = selectTopIncidentsByHouses(incidents, 7)

    expect(result.map((item) => item.id)).toEqual(['INC-1', 'INC-2'])
  })
})
