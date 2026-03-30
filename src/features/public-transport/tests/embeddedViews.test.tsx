import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicTransportPage } from '../PublicTransportPage'

const mockStops = [
  {
    id: 'stop-1',
    name: 'Морской проспект',
    district: 'sov',
    street: 'Морской проспект',
    hasPavilion: true,
    routesRaw: '8, 36',
    routesParsed: [
      { id: 'bus:8', number: '8', mode: 'bus', raw: 'Автобус 8' },
      { id: 'bus:36', number: '36', mode: 'bus', raw: 'Автобус 36' },
    ],
    coordinates: [54.8644, 83.0909] as [number, number],
    dataType: 'mock-fallback',
    source: 'mock',
    updatedAt: '2026-03-30T00:00:00.000Z',
    raw: {},
  },
  {
    id: 'stop-2',
    name: 'Проспект Строителей',
    district: 'sov',
    street: 'Проспект Строителей',
    hasPavilion: false,
    routesRaw: '15',
    routesParsed: [
      { id: 'minibus:15', number: '15', mode: 'minibus', raw: 'Маршрутка 15' },
    ],
    coordinates: [54.8654, 83.0809] as [number, number],
    dataType: 'mock-fallback',
    source: 'mock',
    updatedAt: '2026-03-30T00:00:00.000Z',
    raw: {},
  },
]

vi.mock('../../../store/useSigmaStore', () => ({
  useSigmaStore: (selector: (state: { sourceMode: string }) => unknown) => selector({ sourceMode: 'mock' }),
}))

vi.mock('../hooks/useTransportData', () => ({
  useTransportData: () => ({
    loading: false,
    bundle: {
      stops: mockStops,
      fares: [],
      statuses: [],
      realtime: { available: false, message: 'mock' },
      mode: 'mock',
    },
  }),
}))

vi.mock('../hooks/useTransportQueryState', () => ({
  useTransportQueryState: () => ({
    filters: {
      district: '',
      mode: 'all',
      search: '',
      route: '',
      onlyPavilion: false,
    },
    updateFilters: vi.fn(),
    connectivity: { from: '', to: '' },
    updateConnectivity: vi.fn(),
  }),
}))

vi.mock('../hooks/useLiveTransportRoutes', () => ({
  useLiveTransportRoutes: () => [],
}))

vi.mock('../hooks/useRouteVehicles', () => ({
  useRouteVehicles: () => [],
}))

vi.mock('../components/TransportMap', () => ({
  TransportMap: () => <div data-testid="transport-map">transport-map</div>,
}))

vi.mock('../components/TransportFilters', () => ({
  TransportFilters: () => <div>transport-filters</div>,
}))

vi.mock('../components/TransportMetrics', () => ({
  TransportMetrics: () => <div>transport-metrics</div>,
}))

vi.mock('../components/StopDetailsDrawer', () => ({
  StopDetailsDrawer: () => <div>stop-details</div>,
}))

vi.mock('../components/RouteDetailsPanel', () => ({
  RouteDetailsPanel: () => <div>route-details</div>,
}))

describe('PublicTransportPage embedded views', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement

  const installMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      })),
    })
  }

  const renderPage = async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(<PublicTransportPage embedded />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    return root
  }

  beforeEach(() => {
    installMatchMedia(false)
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('keeps map view on mobile without showing a toggle', async () => {
    const root = await renderPage()

    expect(container.querySelector('[data-testid="transport-map"]')).toBeTruthy()
    expect(container.textContent).toContain('Карта общественного транспорта')
    expect(container.textContent).not.toContain('Список остановок')
    expect(container.textContent).not.toContain('КартаСписок')

    await act(async () => {
      root.unmount()
    })
  })

  it('keeps map view on desktop without showing a toggle', async () => {
    installMatchMedia(true)
    const root = await renderPage()

    expect(container.querySelector('[data-testid="transport-map"]')).toBeTruthy()
    expect(container.textContent).toContain('Карта общественного транспорта')
    expect(container.textContent).not.toContain('Список остановок')
    expect(container.textContent).not.toContain('КартаСписок')

    await act(async () => {
      root.unmount()
    })
  })
})
