import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./components/MapView', () => ({
  MapView: () => <div data-testid="mock-map">map</div>,
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
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('renders mayor dashboard route without crashing to a blank screen', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mayor-dashboard']}>
          <App />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('ЖКХ и энергетика под управлением оперативных источников')

    await act(async () => {
      root.unmount()
    })
  })

  it('redirects legacy public transport route into mayor dashboard transport tab', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/public-transport?route=36']}>
          <App />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Общественный транспорт в управленческом контуре мэра')
    expect(container.textContent).toContain('embedded transport')
    expect(container.textContent).toContain('mode:none')
    expect(container.textContent).toContain('route:36')

    await act(async () => {
      root.unmount()
    })
  })

  it('defaults transport mode and route when opening transport from mayor dashboard button', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mayor-dashboard']}>
          <App />
        </MemoryRouter>,
      )
    })

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
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/mayor-dashboard?subsystem=transport']}>
          <App />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Общественный транспорт в управленческом контуре мэра')
    expect(container.textContent).toContain('embedded transport')
    expect(container.textContent).toContain('mode:none')
    expect(container.textContent).toContain('route:none')

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

    await act(async () => {
      root.unmount()
    })
  })
})
