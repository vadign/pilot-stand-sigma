import { describe, expect, it } from 'vitest'
import { selectCriticalAndOnePlannedPerCollisionBucket, stackNearbyPlacemarks } from './mapPlacemarkStack'

describe('stackNearbyPlacemarks', () => {
  it('keeps distant placemarks in place', () => {
    const result = stackNearbyPlacemarks([
      { id: '1', coordinates: [55, 83] as [number, number] },
      { id: '2', coordinates: [54.9, 82.8] as [number, number] },
    ], 12)

    expect(result[0]?.displayCoordinates).toEqual([55, 83])
    expect(result[0]?.displayOffset).toEqual([0, 0])
    expect(result[1]?.displayCoordinates).toEqual([54.9, 82.8])
    expect(result[1]?.displayOffset).toEqual([0, 0])
  })

  it('stacks nearby placemarks into a centered vertical column', () => {
    const result = stackNearbyPlacemarks([
      { id: '1', coordinates: [55, 83] as [number, number] },
      { id: '2', coordinates: [55, 83] as [number, number] },
      { id: '3', coordinates: [55, 83] as [number, number] },
    ], 12)

    expect(result[0]?.displayCoordinates).toEqual([55, 83])
    expect(result[1]?.displayCoordinates).toEqual([55, 83])
    expect(result[2]?.displayCoordinates).toEqual([55, 83])
    expect(result.map((item) => item.displayOffset)).toEqual([[0, 0], [0, -34], [0, 34]])
  })

  it('uses the center of a collision bucket as the shared anchor', () => {
    const result = stackNearbyPlacemarks([
      { id: '1', coordinates: [55, 83] as [number, number] },
      { id: '2', coordinates: [55.001, 83.002] as [number, number] },
    ], 13)

    expect(result[0]?.displayCoordinates).toEqual([55.0005, 83.001])
    expect(result[1]?.displayCoordinates).toEqual([55.0005, 83.001])
    expect(result.map((item) => item.displayOffset)).toEqual([[0, 0], [0, -34]])
  })

  it('keeps all incidents when they do not overlap', () => {
    const result = selectCriticalAndOnePlannedPerCollisionBucket([
      { id: '1', coordinates: [55, 83] as [number, number], severity: 'критический', liveMeta: { outageKind: 'emergency' } },
      { id: '2', coordinates: [54.9, 82.8] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' } },
    ], 12)

    expect(result.map((item) => item.id)).toEqual(['1', '2'])
  })

  it('keeps all critical incidents and one planned incident in an overlap bucket', () => {
    const result = selectCriticalAndOnePlannedPerCollisionBucket([
      { id: '1', coordinates: [55, 83] as [number, number], severity: 'критический', liveMeta: { outageKind: 'emergency' }, affectedPopulation: 200 },
      { id: '2', coordinates: [55.0004, 83.0005] as [number, number], severity: 'критический', liveMeta: { outageKind: 'emergency' }, affectedPopulation: 150 },
      { id: '3', coordinates: [55.0005, 83.0004] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' }, affectedPopulation: 90 },
      { id: '4', coordinates: [55.0006, 83.0003] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' }, affectedPopulation: 120 },
    ], 12)

    expect(result.map((item) => item.id)).toEqual(['1', '2', '4'])
  })

  it('keeps one planned incident when an overlap bucket has no critical incidents', () => {
    const result = selectCriticalAndOnePlannedPerCollisionBucket([
      { id: '1', coordinates: [55, 83] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' }, affectedPopulation: 80 },
      { id: '2', coordinates: [55.0004, 83.0005] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' }, affectedPopulation: 120 },
    ], 12)

    expect(result.map((item) => item.id)).toEqual(['2'])
  })

  it('treats moderately separated incidents as independent after threshold reduction', () => {
    const result = selectCriticalAndOnePlannedPerCollisionBucket([
      { id: '1', coordinates: [55, 83] as [number, number], severity: 'критический', liveMeta: { outageKind: 'emergency' } },
      { id: '2', coordinates: [55.0038, 83.0053] as [number, number], severity: 'средний', liveMeta: { outageKind: 'planned' } },
    ], 12)

    expect(result.map((item) => item.id)).toEqual(['1', '2'])
  })
})
