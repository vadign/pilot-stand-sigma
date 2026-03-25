import { describe, expect, it } from 'vitest'
import type { Incident } from '../types'
import { selectEmergencyAndTopPlannedByHouses } from './selectEmergencyAndTopPlannedByHouses'

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

describe('selectEmergencyAndTopPlannedByHouses', () => {
  it('keeps all emergency incidents and only the largest planned incidents by house count', () => {
    const incidents = [
      { ...baseIncident, id: '051-emergency-1', liveMeta: { outageKind: 'emergency', raw: { houses: 2 } } },
      { ...baseIncident, id: '051-planned-1', liveMeta: { outageKind: 'planned', raw: { houses: 1 } } },
      { ...baseIncident, id: '051-planned-2', liveMeta: { outageKind: 'planned', raw: { houses: 2 } } },
      { ...baseIncident, id: '051-planned-3', liveMeta: { outageKind: 'planned', raw: { houses: 3 } } },
      { ...baseIncident, id: '051-planned-4', liveMeta: { outageKind: 'planned', raw: { houses: 4 } } },
      { ...baseIncident, id: '051-planned-5', liveMeta: { outageKind: 'planned', raw: { houses: 5 } } },
      { ...baseIncident, id: '051-planned-6', liveMeta: { outageKind: 'planned', raw: { houses: 6 } } },
      { ...baseIncident, id: '051-planned-7', liveMeta: { outageKind: 'planned', raw: { houses: 7 } } },
      { ...baseIncident, id: '051-emergency-2', liveMeta: { outageKind: 'emergency', raw: { houses: 9 } } },
      { ...baseIncident, id: 'noise-1' },
    ]

    const result = selectEmergencyAndTopPlannedByHouses(incidents, 5)

    expect(result.map((item) => item.id)).toEqual([
      '051-emergency-1',
      '051-planned-3',
      '051-planned-4',
      '051-planned-5',
      '051-planned-6',
      '051-planned-7',
      '051-emergency-2',
      'noise-1',
    ])
  })

  it('falls back to original order when planned incidents have no house counts', () => {
    const incidents = [
      { ...baseIncident, id: '051-emergency-1', liveMeta: { outageKind: 'emergency' } },
      { ...baseIncident, id: '051-planned-1', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-planned-2', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-planned-3', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-planned-4', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-planned-5', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-planned-6', liveMeta: { outageKind: 'planned' } },
      { ...baseIncident, id: '051-emergency-2', liveMeta: { outageKind: 'emergency' } },
    ]

    const result = selectEmergencyAndTopPlannedByHouses(incidents, 5)

    expect(result.map((item) => item.id)).toEqual([
      '051-emergency-1',
      '051-planned-1',
      '051-planned-2',
      '051-planned-3',
      '051-planned-4',
      '051-planned-5',
      '051-emergency-2',
    ])
  })

  it('leaves the input untouched when incidents have no outage kinds', () => {
    const incidents = [
      { ...baseIncident, id: 'INC-1' },
      { ...baseIncident, id: 'INC-2' },
    ]

    const result = selectEmergencyAndTopPlannedByHouses(incidents, 5)

    expect(result.map((item) => item.id)).toEqual(['INC-1', 'INC-2'])
  })
})
