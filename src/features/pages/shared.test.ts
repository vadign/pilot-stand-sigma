import { describe, expect, it } from 'vitest'
import { getOutageKindBadgeStyle, severityStyles } from './shared'

describe('shared outage badge styles', () => {
  it('uses a pale red badge for emergency outages', () => {
    expect(getOutageKindBadgeStyle('emergency')).toBe('border-red-200 bg-red-100 text-red-700')
  })

  it('keeps planned outages in the amber palette', () => {
    expect(getOutageKindBadgeStyle('planned')).toBe('border-amber-200 bg-amber-50 text-amber-700')
  })

  it('keeps critical severity visually aligned with emergency outages', () => {
    expect(severityStyles.критический).toBe(getOutageKindBadgeStyle('emergency'))
  })
})
