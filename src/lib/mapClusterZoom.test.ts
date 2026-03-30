import { describe, expect, it } from 'vitest'
import { getModerateClusterZoom } from './mapClusterZoom'

describe('getModerateClusterZoom', () => {
  it('zooms in by two steps', () => {
    expect(getModerateClusterZoom(10)).toBe(12)
  })

  it('respects max zoom cap', () => {
    expect(getModerateClusterZoom(14)).toBe(15)
  })
})
