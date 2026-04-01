import { describe, expect, it } from 'vitest'
import { buildRouteFromState, parseRouteToState } from './adapters'

describe('presentation adapters', () => {
  it('round-trips mayor dashboard state', () => {
    const route = buildRouteFromState({
      pageKey: 'mayor-dashboard',
      subsystem: 'transport',
      district: 'sov',
      view: 'list',
      mode: 'minibus',
      route: '35',
      fromDistrict: 'sov',
      toDistrict: 'len',
      focus: 'connectivity',
      pavilionOnly: true,
    })

    expect(parseRouteToState(route)).toEqual({
      pageKey: 'mayor-dashboard',
      subsystem: 'transport',
      district: 'sov',
      view: 'list',
      mode: 'minibus',
      route: '35',
      fromDistrict: 'sov',
      toDistrict: 'len',
      focus: 'connectivity',
      pavilionOnly: true,
    })
  })

  it('round-trips operations state', () => {
    const route = buildRouteFromState({
      pageKey: 'operations',
      subsystem: 'roads',
      severity: 'критический',
      source: 'mock',
      utility: '',
      outageKind: '',
      district: 'len',
      selected: 'road-1',
    })

    expect(parseRouteToState(route)).toEqual({
      pageKey: 'operations',
      subsystem: 'roads',
      severity: 'критический',
      source: 'mock',
      utility: '',
      outageKind: '',
      district: 'len',
      selected: 'road-1',
    })
  })

  it('round-trips briefing state', () => {
    const route = buildRouteFromState({
      pageKey: 'briefing',
      focus: 'incidents',
      incident: '051-demo',
    })

    expect(parseRouteToState(route)).toEqual({
      pageKey: 'briefing',
      focus: 'incidents',
      incident: '051-demo',
    })
  })

  it('round-trips history state', () => {
    const route = buildRouteFromState({
      pageKey: 'history',
      period: '1q',
      focus: 'districts',
    })

    expect(parseRouteToState(route)).toEqual({
      pageKey: 'history',
      period: '1q',
      focus: 'districts',
    })
  })
})
