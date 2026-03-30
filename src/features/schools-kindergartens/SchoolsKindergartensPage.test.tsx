import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { SchoolsKindergartensPage } from './SchoolsKindergartensPage'

const snapshot = {
  generatedAt: '2026-03-30T00:00:00.000Z',
  city: 'Новосибирск',
  sourceType: 'snapshot',
  sourceUrls: [],
  districts: ['Советский'],
  counts: {
    schools: 1,
    kindergartens: 1,
    geocoded: 2,
    total: 2,
  },
  institutions: [
    {
      id: 'school-1',
      kind: 'school',
      name: 'Школа 1',
      district: 'Советский',
      street: 'Морской проспект',
      streetNormalized: 'морской проспект',
      house: '10',
      address: 'Морской проспект, 10',
      phone: '111-11-11',
      site: 'https://school.example',
      email: null,
      headName: null,
      headRole: null,
      headPhone: null,
      workingHours: null,
      groups: null,
      capacity: 900,
      services: null,
      additionalInfo: null,
      equipment: null,
      specialists: null,
      sports: null,
      coordinates: [54.8644, 83.0909] as [number, number],
    },
    {
      id: 'kg-1',
      kind: 'kindergarten',
      name: 'Детсад 1',
      district: 'Советский',
      street: 'Проспект Строителей',
      streetNormalized: 'проспект строителей',
      house: '5',
      address: 'Проспект Строителей, 5',
      phone: '222-22-22',
      site: null,
      email: null,
      headName: null,
      headRole: null,
      headPhone: null,
      workingHours: null,
      groups: null,
      capacity: 300,
      services: null,
      additionalInfo: null,
      equipment: null,
      specialists: null,
      sports: null,
      coordinates: [54.8654, 83.0809] as [number, number],
    },
  ],
}

vi.mock('./components/EducationMap', () => ({
  EducationMap: () => <div data-testid="education-map">education-map</div>,
}))

describe('SchoolsKindergartensPage embedded views', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement
  let desktopMatches = false
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

  const renderPage = async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(<SchoolsKindergartensPage embedded />)
    })

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (container.textContent?.includes('Районов в контуре')) break
      await act(async () => {
        await Promise.resolve()
      })
    }

    return root
  }

  const findButton = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

  beforeEach(() => {
    installMatchMedia(false)
    container = document.createElement('div')
    document.body.appendChild(container)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => snapshot,
    } as Response)
  })

  it('shows institution list by default on mobile and switches to map on resize', async () => {
    const root = await renderPage()

    expect(findButton('Список')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="education-institution-list"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="education-institution-list-item"]')).toHaveLength(2)
    expect(container.querySelector('[data-testid="education-map"]')).toBeNull()

    await act(async () => {
      findButton('Карта')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="education-map"]')).toBeTruthy()

    await setDesktopMatches(true)
    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="education-map"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="education-institution-list"]')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })

  it('shows map by default on desktop', async () => {
    installMatchMedia(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => snapshot,
    } as Response)
    const root = await renderPage()

    expect(findButton('Карта')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="education-map"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="education-institution-list"]')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })
})
