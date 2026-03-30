import { describe, expect, it } from 'vitest'
import {
  readConnectivityFromParams,
  readFiltersFromParams,
  transportLabelByRouteType,
  transportModeByRouteType,
  writeFiltersToParams,
} from '../queryState'

describe('public transport query state', () => {
  it('reads filters from route params including legacy pavilion key', () => {
    const params = new URLSearchParams('district=%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D1%81%D0%BA%D0%B8%D0%B9&mode=minibus&route=35&search=%D0%BC%D0%BE%D1%80%D0%B5&pavilion=1')
    expect(readFiltersFromParams(params, true)).toEqual({
      district: 'Советский',
      mode: 'minibus',
      search: 'море',
      route: '35',
      onlyPavilion: true,
    })
  })

  it('writes filters back to params without stale transport keys', () => {
    const current = new URLSearchParams('district=Советский&fromDistrict=Советский&focus=map&foo=bar')
    const next = writeFiltersToParams(
      {
        district: 'Ленинский',
        mode: 'bus',
        search: 'вокзал',
        route: '36',
        onlyPavilion: true,
      },
      current,
    )

    expect(next.toString()).toBe(
      'foo=bar&district=%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B9&mode=bus&search=%D0%B2%D0%BE%D0%BA%D0%B7%D0%B0%D0%BB&route=36&pavilion=1&pavilionOnly=true',
    )
  })

  it('reads connectivity params with compareTo fallback', () => {
    const params = new URLSearchParams('district=Советский&compareTo=Центральный')
    expect(readConnectivityFromParams(params)).toEqual({
      from: 'Советский',
      to: 'Центральный',
    })
  })

  it('maps realtime route types to user-facing labels and modes', () => {
    expect(transportModeByRouteType(1)).toBe('trolleybus')
    expect(transportModeByRouteType(7)).toBe('minibus')
    expect(transportLabelByRouteType(2)).toBe('Трамвай')
    expect(transportLabelByRouteType(0)).toBe('Автобус')
  })
})
