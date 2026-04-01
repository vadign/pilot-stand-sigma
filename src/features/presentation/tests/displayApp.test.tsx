import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../../../App'
import type { PresentationSessionInfo } from '../types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const idleSession: PresentationSessionInfo = {
  sid: 'session-1',
  expiresAt: '2026-04-01T20:00:00.000Z',
  scene: { type: 'idle', requestedAt: '2026-04-01T12:00:00.000Z' },
  previousScene: undefined,
  historyDepth: 0,
  mobileUrl: 'https://sigma.test/mobile?s=session-1',
  displayUrl: 'https://sigma.test/display?s=session-1',
}

class MockEventSource {
  static instances: MockEventSource[] = []

  readonly listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>()
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  readonly url: string

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  emit(type: string, payload: unknown) {
    const message = { data: JSON.stringify(payload) } as MessageEvent<string>
    this.listeners.get(type)?.forEach((listener) => listener(message))
  }

  close() {
    return undefined
  }
}

vi.mock('../../../components/MapView', () => ({
  MapView: () => <div data-testid="mock-map">map</div>,
}))

vi.mock('../../../features/public-transport', async () => {
  const { useSearchParams } = await import('react-router-dom')
  return {
    PublicTransportPage: ({ embedded }: { embedded?: boolean }) => {
      const [searchParams] = useSearchParams()
      return <div>{embedded ? 'embedded transport' : 'transport page'} route:{searchParams.get('route') ?? 'none'}</div>
    },
  }
})

vi.mock('../../../features/schools-kindergartens', () => ({
  SchoolsKindergartensPage: ({ embedded }: { embedded?: boolean }) => <div>{embedded ? 'embedded education' : 'education page'}</div>,
}))

vi.mock('../../../live/hooks/useLiveDataBootstrap', () => ({
  useLiveDataBootstrap: () => undefined,
}))

describe('presentation display routes', () => {
  let container: HTMLDivElement
  let root: Root

  const waitForText = async (text: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (container.textContent?.includes(text)) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
  }

  beforeEach(() => {
    MockEventSource.instances = []
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(min-width: 1024px)',
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      })),
    })
    vi.stubGlobal('EventSource', MockEventSource)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/session/create') {
        return new Response(JSON.stringify({ sid: idleSession.sid, expiresAt: idleSession.expiresAt }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (url.startsWith(`/session/${idleSession.sid}/info`)) {
        return new Response(JSON.stringify(idleSession), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      throw new Error(`Unhandled fetch: ${url} ${init?.method ?? 'GET'}`)
    }))

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  it('creates a session on /display and renders the session qr/link screen', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/display']}>
          <App />
        </MemoryRouter>,
      )
    })

    await waitForText('Большой экран для Ask Sigma и панелей мэра')
    await waitForText('https://sigma.test/mobile?s=session-1')

    expect(container.textContent).toContain('Пульт на смартфоне')
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a fallback qr link when session info is temporarily unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/session/create') {
        return new Response(JSON.stringify({ sid: idleSession.sid, expiresAt: idleSession.expiresAt }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (url.startsWith(`/session/${idleSession.sid}/info`)) {
        return new Response(JSON.stringify({ error: 'temporary failure' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }

      throw new Error(`Unhandled fetch: ${url}`)
    }))

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'https://sigma.test',
        hostname: 'sigma.test',
      },
    })

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/display']}>
          <App />
        </MemoryRouter>,
      )
    })

    await waitForText('https://sigma.test/mobile?s=session-1')

    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('shows fullscreen answer overlay and navigates to presentation pages without layout chrome', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/display?s=${idleSession.sid}`]}>
          <App />
        </MemoryRouter>,
      )
    })

    await waitForText('Пульт на смартфоне')

    const stream = MockEventSource.instances[0]
    if (!stream) throw new Error('Presentation EventSource was not created')

    await act(async () => {
      stream.onopen?.()
      stream.emit('scene', {
        type: 'answer',
        query: 'сводка за 24 часа',
        requestedAt: '2026-04-01T12:10:00.000Z',
        result: {
          type: 'BRIEFING',
          title: 'Сводка за 24 часа',
          summary: 'Короткий ответ',
          actions: [{ label: 'Открыть брифинг', route: '/briefing' }],
          explain: { dataType: 'real', source: 'test', updatedAt: '2026-04-01T12:10:00.000Z' },
        },
      })
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Ответ на большом экране')
    expect(container.textContent).toContain('сводка за 24 часа')

    await act(async () => {
      stream.emit('snapshot', {
        ...idleSession,
        scene: {
          type: 'page',
          route: '/mayor-dashboard?subsystem=transport&mode=minibus&route=35',
          label: 'Транспорт',
          requestedAt: '2026-04-01T12:12:00.000Z',
        },
      })
      stream.emit('scene', {
        type: 'page',
        route: '/mayor-dashboard?subsystem=transport&mode=minibus&route=35',
        label: 'Транспорт',
        requestedAt: '2026-04-01T12:12:00.000Z',
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitForText('embedded transport')

    expect(container.textContent).not.toContain('Кабинет руководителя')
    expect(container.textContent).not.toContain('Панель мэра')
  })
})
