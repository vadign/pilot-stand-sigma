import { describe, expect, it } from 'vitest'
import { selectVisibleMapLabelIds } from './mapLabelDeclutter'

const points = Array.from({ length: 16 }, (_, index) => ({
  id: String(index),
  coordinates: [55.03 + index * 0.0004, 82.98 + index * 0.0004] as [number, number],
}))

describe('selectVisibleMapLabelIds', () => {
  it('hides labels below minimum zoom except selected point', () => {
    const visible = selectVisibleMapLabelIds(points, 10, { selectedId: '4', minZoom: 12 })

    expect(Array.from(visible)).toEqual(['4'])
  })

  it('limits labels by density buckets', () => {
    const visible = selectVisibleMapLabelIds(points, 12, { minZoom: 12 })

    expect(visible.size).toBeLessThanOrEqual(8)
  })

  it('prioritizes higher-priority points', () => {
    const visible = selectVisibleMapLabelIds(points.slice(0, 4), 15, {
      minZoom: 12,
      getPriority: (item) => (item.id === '3' ? 100 : 0),
    })

    expect(visible.has('3')).toBe(true)
  })
})
