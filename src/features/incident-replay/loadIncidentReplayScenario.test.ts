import { describe, expect, it } from 'vitest'
import { incidents } from '../../mocks/data'
import type { LiveIncidentView } from '../../live/types'
import { loadIncidentReplayScenario } from './loadIncidentReplayScenario'

const heatIncident = incidents.find((incident) => incident.subsystem === 'heat')!

const replayIncident: LiveIncidentView = {
  ...heatIncident,
  sourceKind: 'mock',
  sourceBadge: 'mock',
  dataType: 'pilot',
  sourceUpdatedAt: heatIncident.detectedAt,
  canArchive: true,
  canResolve: true,
  workflowEntries: [],
}

describe('loadIncidentReplayScenario', () => {
  it('builds the demo timeline for a heat incident in the expected order', async () => {
    const scenario = await loadIncidentReplayScenario(replayIncident)

    expect(scenario.incidentId).toBe(replayIncident.id)
    expect(scenario.events).toHaveLength(9)
    expect(scenario.events.map((event) => event.relativeTimeLabel)).toEqual([
      'T-72ч',
      'T-36ч',
      'T-18ч',
      'T-6ч',
      'T-0',
      'T+15м',
      'T+30м',
      'T+1ч',
      'T+2ч',
    ])
  })

  it('marks phases and forecast fields correctly', async () => {
    const scenario = await loadIncidentReplayScenario(replayIncident)
    const beforeEvent = scenario.events[0]
    const incidentEvent = scenario.events[4]
    const afterEvent = scenario.events.at(-1)

    expect(beforeEvent.phase).toBe('before')
    expect(beforeEvent.status).toBe('warning-low')
    expect(beforeEvent.isMilestone).toBe(true)
    expect(beforeEvent.probability).toBe(25)

    expect(incidentEvent.phase).toBe('incident')
    expect(incidentEvent.status).toBe('critical')
    expect(incidentEvent.probability).toBe(100)

    expect(afterEvent?.phase).toBe('after')
    expect(afterEvent?.status).toBe('forecast-critical')
    expect(afterEvent?.probability).toBeUndefined()
    expect(afterEvent?.consequences?.length).toBeGreaterThan(0)
  })
})
