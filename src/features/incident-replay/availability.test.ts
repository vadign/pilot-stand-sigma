import { describe, expect, it } from 'vitest'
import {
  buildIncidentReplayRoute,
  canOpenIncidentReplay,
  incidentReplayCtaLabel,
  isHeatReplayIncident,
} from './availability'

describe('incident replay availability', () => {
  it('keeps the replay route stable', () => {
    expect(buildIncidentReplayRoute('INC-1001')).toBe('/incidents/INC-1001/replay')
    expect(incidentReplayCtaLabel).toBe('Открыть воспроизведение и прогноз')
  })

  it('detects incidents that belong to the hot water / heating contour', () => {
    expect(
      isHeatReplayIncident({
        id: 'INC-ENERGY',
        subsystem: 'heat',
        severity: 'средний',
      }),
    ).toBe(true)

    expect(
      isHeatReplayIncident({
        id: 'INC-HOT-WATER',
        subsystem: 'utilities',
        severity: 'средний',
        liveMeta: { utilityType: 'hot_water', outageKind: 'planned' },
      }),
    ).toBe(true)

    expect(
      isHeatReplayIncident({
        id: 'INC-ELECTRICITY',
        subsystem: 'utilities',
        severity: 'критический',
        liveMeta: { utilityType: 'electricity', outageKind: 'emergency' },
      }),
    ).toBe(false)
  })

  it('allows replay for critical and emergency incidents in the hot water / heating contour', () => {
    expect(
      canOpenIncidentReplay({
        id: 'INC-HEAT',
        subsystem: 'heat',
        severity: 'критический',
      }),
    ).toBe(true)

    expect(
      canOpenIncidentReplay({
        id: 'INC-EMERGENCY',
        subsystem: 'utilities',
        severity: 'средний',
        liveMeta: { outageKind: 'emergency', utilityType: 'hot_water' },
      }),
    ).toBe(true)
  })

  it('keeps replay hidden outside the hot water / heating contour and for regular incidents', () => {
    expect(
      canOpenIncidentReplay({
        id: 'INC-REGULAR',
        subsystem: 'noise',
        severity: 'критический',
      }),
    ).toBe(false)

    expect(
      canOpenIncidentReplay({
        id: 'INC-ENERGY-REGULAR',
        subsystem: 'heat',
        severity: 'высокий',
      }),
    ).toBe(false)

    expect(
      canOpenIncidentReplay({
        id: 'INC-ELECTRICITY',
        subsystem: 'utilities',
        severity: 'критический',
        liveMeta: { utilityType: 'electricity', outageKind: 'emergency' },
      }),
    ).toBe(false)
  })
})
