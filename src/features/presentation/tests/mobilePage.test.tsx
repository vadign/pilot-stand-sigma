import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PresentationMobilePage from '../PresentationMobilePage'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const buildSessionInfo = (scene: Record<string, unknown>, controller?: { clientId: string; claimedAt: string }) => ({
  sid: 'session-1',
  expiresAt: '2026-04-01T20:00:00.000Z',
  scene,
  previousScene: { type: 'idle', requestedAt: '2026-04-01T12:00:00.000Z' },
  historyDepth: scene.type === 'idle' ? 0 : 1,
  controller,
  mobileUrl: 'https://sigma.test/mobile?s=session-1',
  displayUrl: 'https://sigma.test/display?s=session-1',
})

describe('PresentationMobilePage', () => {
  let container: HTMLDivElement
  let root: Root
  let fetchSpy: ReturnType<typeof vi.fn>

  const findButton = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(label))

  const setInputValue = async (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, value)
    await act(async () => {
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(min-width: 1024px)',
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      })),
    })
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })

    fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/session/session-1/info')) {
        return new Response(JSON.stringify(buildSessionInfo({ type: 'idle', requestedAt: '2026-04-01T12:00:00.000Z' })), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (url === '/session/session-1/command' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        const command = body.command

        if (command.type === 'SHOW_ANSWER') {
          return new Response(JSON.stringify(buildSessionInfo({
            type: 'answer',
            query: command.query,
            result: command.result,
            actions: command.actions ?? command.result.actions ?? [],
            requestedAt: '2026-04-01T12:01:00.000Z',
          }, { clientId: body.clientId, claimedAt: '2026-04-01T12:01:00.000Z' })), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }

        if (command.type === 'PATCH_PAGE_STATE') {
          const nextSubsystem = command.patch.subsystem ?? 'roads'
          return new Response(JSON.stringify(buildSessionInfo({
            type: 'page',
            route: `/mayor-dashboard?subsystem=${nextSubsystem}`,
            label: command.label ?? 'Панель мэра',
            pageKey: 'mayor-dashboard',
            state: {
              pageKey: 'mayor-dashboard',
              subsystem: nextSubsystem,
              district: command.patch.district ?? '',
              view: command.patch.view ?? 'map',
              mode: command.patch.mode ?? 'minibus',
              route: command.patch.route ?? '35',
              fromDistrict: '',
              toDistrict: '',
              focus: command.patch.focus ?? 'overview',
              pavilionOnly: false,
            },
            requestedAt: '2026-04-01T12:02:00.000Z',
          }, { clientId: body.clientId, claimedAt: '2026-04-01T12:02:00.000Z' })), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }

        if (command.type === 'OPEN_PAGE') {
          return new Response(JSON.stringify(buildSessionInfo({
            type: 'page',
            route: '/briefing',
            label: command.label ?? 'Брифинг',
            pageKey: command.page.pageKey,
            state: command.page,
            requestedAt: '2026-04-01T12:02:00.000Z',
          }, { clientId: body.clientId, claimedAt: '2026-04-01T12:02:00.000Z' })), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      }

      throw new Error(`Unhandled fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchSpy)

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

  it('submits ask requests with haptic feedback and renders returned actions', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mobile?s=session-1']}>
          <PresentationMobilePage />
        </MemoryRouter>,
      )
    })

    const input = container.querySelector('input')
    if (!(input instanceof HTMLInputElement)) throw new Error('Ask input not found')

    await setInputValue(input, 'сводка за 24 часа')

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
      await Promise.resolve()
    })

    expect(window.navigator.vibrate).toHaveBeenCalled()
    expect(container.textContent).toContain('Сводка за 24 часа')
    expect(container.textContent).toContain('Открыть сводку')
  })

  it('shows takeover prompt when another mobile already controls the session', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/session/session-1/info')) {
        return new Response(JSON.stringify(buildSessionInfo(
          { type: 'idle', requestedAt: '2026-04-01T12:00:00.000Z' },
          { clientId: 'other-mobile', claimedAt: '2026-04-01T12:00:00.000Z' },
        )), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (url === '/session/session-1/command') {
        return new Response(JSON.stringify({
          error: 'controller_conflict',
          controller: { clientId: 'other-mobile', claimedAt: '2026-04-01T12:00:00.000Z' },
        }), { status: 409, headers: { 'Content-Type': 'application/json' } })
      }

      throw new Error(`Unhandled fetch: ${url} ${init?.method ?? 'GET'}`)
    }))

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mobile?s=session-1']}>
          <PresentationMobilePage />
        </MemoryRouter>,
      )
    })

    const input = container.querySelector('input')
    if (!(input instanceof HTMLInputElement)) throw new Error('Ask input not found')

    await setInputValue(input, 'сводка за 24 часа')

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Сессия занята')
    expect(findButton('Перехватить управление')).toBeTruthy()
  })

  it('switches mayor dashboard tabs through typed presentation commands', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mobile?s=session-1']}>
          <PresentationMobilePage />
        </MemoryRouter>,
      )
    })

    const roadsButton = findButton('Дороги')
    if (!roadsButton) throw new Error('Roads tab button not found')

    await act(async () => {
      roadsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const commandCall = fetchSpy.mock.calls.find(([url]) => String(url) === '/session/session-1/command')
    expect(commandCall).toBeTruthy()
    const requestInit = commandCall?.[1] as RequestInit | undefined
    const requestBody = JSON.parse(String(requestInit?.body))

    expect(requestInit?.method).toBe('POST')
    expect(requestBody.command.type).toBe('PATCH_PAGE_STATE')
    expect(requestBody.command.pageKey).toBe('mayor-dashboard')
    expect(requestBody.command.patch.subsystem).toBe('roads')
    expect(requestBody.command.label).toBe('Панель мэра · Дороги')
    expect(roadsButton.getAttribute('aria-pressed')).toBe('true')
    expect(container.textContent).toContain('Экран: Панель мэра · Дороги')
  })

  it('does not expose operations controls on the mobile console', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mobile?s=session-1']}>
          <PresentationMobilePage />
        </MemoryRouter>,
      )
    })

    expect(findButton('Операции')).toBeUndefined()
    expect(container.textContent).not.toContain('Операции ·')
  })
})
