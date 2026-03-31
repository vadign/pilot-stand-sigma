import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./components/MapView', () => ({
  MapView: ({ incidents }: { incidents: Array<{ id: string }> }) => (
    <div data-testid="mock-map">map:{incidents.length}</div>
  ),
}))

vi.mock('./features/public-transport', async () => {
  const { useSearchParams } = await import('react-router-dom')
  return {
    PublicTransportPage: ({ embedded }: { embedded?: boolean }) => {
      const [searchParams] = useSearchParams()
      return <div>{embedded ? 'embedded transport' : 'transport page'} mode:{searchParams.get('mode') ?? 'none'} route:{searchParams.get('route') ?? 'none'}</div>
    },
  }
})

vi.mock('./features/schools-kindergartens', () => ({
  SchoolsKindergartensPage: ({ embedded }: { embedded?: boolean }) => <div>{embedded ? 'embedded education' : 'education page'}</div>,
}))

vi.mock('./live/hooks/useLiveDataBootstrap', () => ({
  useLiveDataBootstrap: () => undefined,
}))

describe('App smoke render', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let desktopMatches = true
  let container: HTMLDivElement
  const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>()

  const installMatchMedia = (matches: boolean) => {
    desktopMatches = matches
    mediaQueryListeners.clear()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: desktopMatches,
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaQueryListeners.add(listener)
        },
        removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaQueryListeners.delete(listener)
        },
        addListener: (listener: (event: MediaQueryListEvent) => void) => {
          mediaQueryListeners.add(listener)
        },
        removeListener: (listener: (event: MediaQueryListEvent) => void) => {
          mediaQueryListeners.delete(listener)
        },
        dispatchEvent: () => true,
      })),
    })
  }

  const setDesktopMatches = async (matches: boolean) => {
    desktopMatches = matches

    await act(async () => {
      mediaQueryListeners.forEach((listener) =>
        listener({ matches: desktopMatches, media: '(min-width: 1024px)' } as MediaQueryListEvent),
      )
      await Promise.resolve()
    })
  }

  const renderApp = async (initialEntries: string[]) => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>,
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    return root
  }

  const waitForText = async (text: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (container.textContent?.includes(text)) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
  }

  const findButton = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

  const findButtonContaining = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(label))

  beforeEach(() => {
    installMatchMedia(true)
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('renders mayor dashboard route without crashing to a blank screen', async () => {
    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('ЖКХ и энергетика под управлением оперативных источников')

    expect(container.textContent).toContain('ЖКХ и энергетика под управлением оперативных источников')

    await act(async () => {
      root.unmount()
    })
  })

  it('defaults mayor dashboard events view to map on desktop', async () => {
    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('Территориальные события')

    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('true')
    expect(findButton('Список')?.getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('[data-testid="mock-map"]')?.textContent).toContain('map:')
    expect(container.querySelector('[data-testid="mayor-events-list"]')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })

  it('defaults mayor dashboard events view to list on mobile', async () => {
    installMatchMedia(false)

    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('Территориальные события')

    expect(findButton('Список')?.getAttribute('aria-pressed')).toBe('true')
    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('[data-testid="mock-map"]')).toBeNull()
    expect(container.querySelector('[data-testid="mayor-events-list"]')).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
  })

  it('shows only the mayor dashboard entry in the mobile navigation menu', async () => {
    installMatchMedia(false)

    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('Территориальные события')

    await act(async () => {
      findButton('Разделы')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const mobileNav = container.querySelector('[data-testid="mobile-nav"]')

    expect(mobileNav?.textContent).toContain('Панель мэра')
    expect(mobileNav?.textContent).not.toContain('Управленческий отчет')
    expect(mobileNav?.textContent).not.toContain('История и аналитика')

    await act(async () => {
      root.unmount()
    })
  })

  it('keeps secondary mayor dashboard sections collapsed on mobile until expanded', async () => {
    installMatchMedia(false)

    const root = await renderApp(['/mayor-dashboard?subsystem=roads'])
    await waitForText('Территориальные события')

    expect(findButtonContaining('Приоритетные события')?.getAttribute('aria-expanded')).toBe('false')
    expect(findButtonContaining('Районы под нагрузкой')?.getAttribute('aria-expanded')).toBe('false')
    expect(findButtonContaining('Аналитика')?.getAttribute('aria-expanded')).toBe('false')
    expect(container.textContent).not.toContain('Разбивка по статусам')
    expect(container.textContent).not.toContain('В работе / эскалированы')

    await act(async () => {
      findButtonContaining('Аналитика')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(findButtonContaining('Аналитика')?.getAttribute('aria-expanded')).toBe('true')
    expect(container.textContent).toContain('Разбивка по статусам')
    expect(container.textContent).toContain('В работе / эскалированы')

    await act(async () => {
      root.unmount()
    })
  })

  it('switches mayor dashboard events view manually and reapplies breakpoint default on resize', async () => {
    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('Территориальные события')

    await act(async () => {
      findButton('Список')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(findButton('Список')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="mayor-events-list"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="mock-map"]')).toBeNull()

    await setDesktopMatches(false)

    expect(findButton('Список')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="mayor-events-list"]')).toBeTruthy()

    await setDesktopMatches(true)

    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="mock-map"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="mayor-events-list"]')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })

  it('applies district filter to both mayor dashboard list and map views', async () => {
    installMatchMedia(false)

    const root = await renderApp(['/mayor-dashboard?subsystem=roads'])
    await waitForText('Территориальные события')

    const districtSelect = container.querySelector('select') as HTMLSelectElement | null
    expect(districtSelect).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="mayor-events-list-item"]')).toHaveLength(6)

    await act(async () => {
      if (districtSelect) {
        districtSelect.value = 'len'
        districtSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    expect(container.textContent).toContain('1 в списке')
    expect(container.querySelectorAll('[data-testid="mayor-events-list-item"]')).toHaveLength(1)

    await act(async () => {
      findButton('Карта')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mock-map"]')?.textContent).toBe('map:1')

    await act(async () => {
      root.unmount()
    })
  })

  it('uses the pale red critical badge in mayor dashboard priority events', async () => {
    const root = await renderApp(['/mayor-dashboard?subsystem=roads'])
    await waitForText('Приоритетные события')

    const criticalBadge = Array.from(container.querySelectorAll('span')).find(
      (element) => element.textContent?.trim() === 'критический',
    ) as HTMLSpanElement | undefined

    expect(criticalBadge).toBeTruthy()
    expect(criticalBadge?.className).toContain('bg-red-100')
    expect(criticalBadge?.className).toContain('text-red-700')

    await act(async () => {
      root.unmount()
    })
  })

  it('keeps secondary mayor dashboard analytics visible on desktop', async () => {
    const root = await renderApp(['/mayor-dashboard?subsystem=roads'])
    await waitForText('Разбивка по статусам')

    expect(container.textContent).toContain('Разбивка по статусам')
    expect(container.textContent).toContain('В работе / эскалированы')
    expect(container.textContent).toContain('Население в зоне')

    await act(async () => {
      root.unmount()
    })
  })

  it('redirects legacy public transport route into mayor dashboard transport tab', async () => {
    const root = await renderApp(['/public-transport?route=36'])
    await waitForText('Общественный транспорт в управленческом контуре мэра')

    expect(container.textContent).toContain('Общественный транспорт в управленческом контуре мэра')
    expect(container.textContent).toContain('embedded transport')
    expect(container.textContent).toContain('mode:none')
    expect(container.textContent).toContain('route:36')

    await act(async () => {
      root.unmount()
    })
  })

  it('defaults transport mode and route when opening transport from mayor dashboard button', async () => {
    const root = await renderApp(['/mayor-dashboard'])
    await waitForText('ЖКХ и энергетика под управлением оперативных источников')

    const transportButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Общественный транспорт'))
    expect(transportButton).toBeTruthy()

    await act(async () => {
      transportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Общественный транспорт в управленческом контуре мэра')
    expect(container.textContent).toContain('embedded transport')
    expect(container.textContent).toContain('mode:minibus')
    expect(container.textContent).toContain('route:35')

    await act(async () => {
      root.unmount()
    })
  })

  it('does not force a transport mode or route when opening mayor dashboard transport tab', async () => {
    const root = await renderApp(['/mayor-dashboard?subsystem=transport'])
    await waitForText('Общественный транспорт в управленческом контуре мэра')

    expect(container.textContent).toContain('Общественный транспорт в управленческом контуре мэра')
    expect(container.textContent).toContain('embedded transport')
    expect(container.textContent).toContain('mode:none')
    expect(container.textContent).toContain('route:none')
    expect(findButton('Карта')).toBeFalsy()
    expect(findButton('Список')).toBeFalsy()

    await act(async () => {
      root.unmount()
    })
  })

  it('renders education tab inside mayor dashboard', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mayor-dashboard?subsystem=education']}>
          <App />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Школы и детские сады в городском контуре социальной инфраструктуры')
    expect(container.textContent).toContain('embedded education')
    expect(findButton('Карта')).toBeFalsy()
    expect(findButton('Список')).toBeFalsy()

    await act(async () => {
      root.unmount()
    })
  })
})
