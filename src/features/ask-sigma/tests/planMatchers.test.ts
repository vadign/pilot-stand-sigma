import { describe, expect, it } from 'vitest'
import { ASK_SIGMA_MATCHERS, matchesTransitMapIntent } from '../planMatchers'

describe('plan matchers', () => {
  it('detects transit map intent only with transport context', () => {
    expect(matchesTransitMapIntent('покажи общественный транспорт на карте')).toBe(true)
    expect(matchesTransitMapIntent('покажи на карте сводку по жкх')).toBe(false)
  })

  it('keeps critical/help/approvals detection behavior', () => {
    expect(ASK_SIGMA_MATCHERS.critical.test('критические отключения')).toBe(true)
    expect(ASK_SIGMA_MATCHERS.helpIntent.test('что умеет сигма')).toBe(true)
    expect(ASK_SIGMA_MATCHERS.approvals.test('требует согласования')).toBe(true)
  })
})
