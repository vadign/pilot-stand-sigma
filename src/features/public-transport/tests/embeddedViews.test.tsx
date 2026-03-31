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

let desktopMatches = false
let transportFiltersState = {
  district: '',
  mode: 'all',
  search: '',
  route: '',
  onlyPavilion: false,
}
let connectivityState = { from: '', to: '' }

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
    filters: transportFiltersState,
    updateFilters: vi.fn(),
    connectivity: connectivityState,
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
  TransportMap: ({ onSelectStop }: { onSelectStop?: (stop: (typeof mockStops)[number]) => void }) => (
    <button
      type="button"
      data-testid="transport-map"
      onClick={() => onSelectStop?.(mockStops[0])}
    >
      transport-map
    </button>
  ),
}))

vi.mock('../components/TransportFilters', () => ({
  TransportFilters: () => <div>transport-filters</div>,
}))

vi.mock('../components/TransportMetrics', () => ({
  TransportMetrics: () => <div>transport-metrics</div>,
}))

vi.mock('../components/StopDetailsDrawer', () => ({
  StopDetailsDrawer: ({ stop }: { stop?: { name: string } }) =>
    stop ? <div data-testid="stop-details">stop-details:{stop.name}</div> : null,
}))

vi.mock('../components/RouteDetailsPanel', () => ({
  RouteDetailsPanel: ({ route }: { route?: { routeId: string } }) =>
    route ? <div data-testid="route-details">route-details:{route.routeId}</div> : null,
}))

describe('PublicTransportPage embedded views', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement

  const installMatchMedia = (matches: boolean) => {
    desktopMatches = matches
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: desktopMatches,
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

  const findButtonContaining = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(label))

  beforeEach(() => {
    installMatchMedia(false)
    transportFiltersState = {
      district: '',
      mode: 'all',
      search: '',
      route: '',
      onlyPavilion: false,
    }
    connectivityState = { from: '', to: '' }
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('keeps map view on mobile, hides secondary sections, and shows stop details after selection', async () => {
    const root = await renderPage()

    expect(container.querySelector('[data-testid="transport-map"]')).toBeTruthy()
    expect(container.textContent).toContain('Карта общественного транспорта')
    expect(container.textContent).not.toContain('Список остановок')
    expect(container.textContent).not.toContain('КартаСписок')
    expect(findButtonContaining('Сводка сети')?.getAttribute('aria-expanded')).toBe('false')
    expect(findButtonContaining('Связность районов')?.getAttribute('aria-expanded')).toBe('false')
    expect(container.textContent).not.toContain('transport-metrics')
    expect(container.querySelector('[data-testid="stop-details"]')).toBeNull()

    await act(async () => {
      container.querySelector('[data-testid="transport-map"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(container.querySelector('[data-testid="stop-details"]')?.textContent).toContain('Морской проспект')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows route details immediately below the map on mobile when a route is selected', async () => {
    transportFiltersState = {
      district: '',
      mode: 'all',
      search: '',
      route: '8',
      onlyPavilion: false,
    }

    const root = await renderPage()

    expect(container.querySelector('[data-testid="route-details"]')?.textContent).toContain('8')
    expect(container.textContent).not.toContain('transport-metrics')

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
    expect(container.textContent).toContain('transport-metrics')
    expect(findButtonContaining('Сводка сети')).toBeFalsy()
    expect(findButtonContaining('Связность районов')).toBeFalsy()

    await act(async () => {
      root.unmount()
    })
  })
})
