import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseStopsCsv } from '../parsers/parseStopsCsv'
import { parseTariffsCsv } from '../parsers/parseTariffsCsv'
import { NovosibirskStopsProvider } from '../providers/NovosibirskStopsProvider'
import { selectDistrictConnectivity, selectFilteredStops, selectGlobalTransportMetrics, selectRouteDetails } from '../selectors'
import { flattenRoutes } from '../server/nskgortransProxy'
import { buildDistrictMetrics } from '../utils/buildDistrictMetrics'
import { buildRouteMetrics } from '../utils/buildRouteMetrics'
import { inferTransitMode, parseRoutes } from '../utils/parseRoutes'

const stopsCsv = readFileSync('src/features/public-transport/tests/fixtures/stops.csv', 'utf-8')
const tariffsCsv = readFileSync('src/features/public-transport/tests/fixtures/tariffs.csv', 'utf-8')

describe('public transport', () => {
  it('parses dataset 49 stops csv', () => {
    const stops = parseStopsCsv(stopsCsv, '2026-03-20T00:00:00.000Z')
    expect(stops).toHaveLength(4)
    expect(stops[0]?.name).toBe('Морской проспект')
    expect(stops[3]?.coordinates).toBeNull()
  })

  it('parses routes from Marshryt and classifies modes', () => {
    const routes = parseRoutes('Автобус: 8, 23, 36. Троллейбус: 5. Маршрутное такси: 15')
    expect(routes.map((route) => route.number)).toEqual(['8', '23', '36', '5', '15'])
    expect(inferTransitMode('Трамвай')).toBe('tram')
    expect(inferTransitMode('Маршрутное такси')).toBe('minibus')
  })

  it('builds metrics reducers', () => {
    const stops = parseStopsCsv(stopsCsv)
    const district = buildDistrictMetrics(stops, 'Советский')
    const routes = buildRouteMetrics(stops)
    expect(district.stopCount).toBe(2)
    expect(district.uniqueRoutes).toBeGreaterThan(3)
    expect(routes[0]?.stopCount).toBeGreaterThan(0)
  })

  it('parses dataset 51 tariffs', () => {
    const fares = parseTariffsCsv(tariffsCsv)
    expect(fares).toHaveLength(4)
    expect(fares[0]?.amount).toBe(40)
    expect(fares[2]?.fareType).toContain('Льготный')
  })

  it('computes route intersection between districts', () => {
    const stops = parseStopsCsv(stopsCsv)
    const connectivity = selectDistrictConnectivity(stops, 'Советский', 'Центральный')
    expect(connectivity.count).toBe(2)
    expect(connectivity.commonRoutes).toEqual(['8', '36'])
  })

  it('falls back to mock data when live data is unavailable', async () => {
    const provider = new NovosibirskStopsProvider({ read: async () => ({ entry: undefined, fresh: false }), write: async () => undefined } as never, async () => { throw new Error('offline') })
    const result = await provider.load('hybrid')
    expect(result.status.source).toBe('mock')
    expect(result.status.dataType).toBe('mock-fallback')
    expect(result.stops.length).toBeGreaterThan(0)
  })

  it('supports selectors for filtered stops and route metrics', () => {
    const stops = parseStopsCsv(stopsCsv)
    const filtered = selectFilteredStops(stops, { district: 'Советский', mode: 'bus', search: 'морской', route: '8', onlyPavilion: true })
    const global = selectGlobalTransportMetrics(stops, parseTariffsCsv(tariffsCsv))
    const route = selectRouteDetails(stops, '8')
    expect(filtered).toHaveLength(1)
    expect(global.totalStops).toBe(4)
    expect(route?.stopCount).toBe(2)
  })

  it('flattens nskgortrans route groups into proxy route ids', () => {
    const routes = flattenRoutes([
      {
        type: 0,
        ways: [{ marsh: '10', name: '10', stopb: 'ЖК Парус', stope: 'Вокзал' }],
      },
      {
        type: 1,
        ways: [{ marsh: '5', name: '5', stopb: 'Линия А', stope: 'Линия Б' }],
      },
    ])

    expect(routes).toHaveLength(2)
    expect(routes[0]).toEqual({ routeId: '2-5-W-5', type: 1, marsh: '5', number: '5', stopA: 'Линия А', stopB: 'Линия Б' })
    expect(routes[1]).toEqual({ routeId: '1-10-W-10', type: 0, marsh: '10', number: '10', stopA: 'ЖК Парус', stopB: 'Вокзал' })
  })
})
