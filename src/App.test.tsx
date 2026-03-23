import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./components/MapView', () => ({
  MapView: () => <div data-testid="mock-map">map</div>,
}))

vi.mock('./features/public-transport', () => ({
  PublicTransportPage: ({ embedded }: { embedded?: boolean }) => <div>{embedded ? 'embedded transport' : 'transport page'}</div>,
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

    expect(container.textContent).toContain('ЖКХ и теплоснабжение под управлением live-источников')

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

    await act(async () => {
      root.unmount()
    })
  })
})
