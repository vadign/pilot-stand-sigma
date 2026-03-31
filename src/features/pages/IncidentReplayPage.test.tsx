import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import IncidentReplayPage from './IncidentReplayPage'
import { createSigmaState, useSigmaStore } from '../../store/useSigmaStore'
import { createTestLiveBundle } from '../../testUtils/liveBundle'

vi.mock('../../components/MapView', () => ({
  MapView: () => <div data-testid="mock-incident-replay-map">map</div>,
}))

const resetStore = () => {
  useSigmaStore.setState(createSigmaState(useSigmaStore.setState, useSigmaStore.getState), true)
  useSigmaStore.getState().applyLiveBundle(createTestLiveBundle().bundle)
}

describe('IncidentReplayPage', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement
  let heatIncidentId = ''

  const renderPage = async (path: string) => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/incidents/:id/replay" element={<IncidentReplayPage />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    return root
  }

  beforeEach(() => {
    resetStore()
    heatIncidentId = createTestLiveBundle().heatIncidentId
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
  })

  it('renders the replay screen and switches events through the timeline controls', async () => {
    const root = await renderPage(`/incidents/${heatIncidentId}/replay`)

    expect(container.textContent).toContain('Воспроизведение и прогноз инцидента')
    expect(container.querySelector('[data-testid="incident-replay-diagram"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="mock-incident-replay-map"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="incident-replay-range"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="incident-replay-active-summary"]')?.textContent).toContain(
      'T-0',
    )
    expect(container.textContent).toContain('Аварийный прорыв участка')
    expect(container.querySelector('[data-testid="incident-replay-timeline-point-t-zero"]')).toBeNull()

    await act(async () => {
      container
        .querySelector('[data-testid="incident-replay-jump-t-plus-15m"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="incident-replay-active-summary"]')?.textContent).toContain(
      'T+15м',
    )
    expect(container.textContent).toContain('Нарушение режима начинает затрагивать подключенные объекты')
    expect(container.textContent).toContain('Что будет дальше')

    await act(async () => {
      const range = container.querySelector('[data-testid="incident-replay-range"]') as HTMLInputElement
      range.value = '6'
      range.dispatchEvent(new Event('input', { bubbles: true }))
      range.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="incident-replay-active-summary"]')?.textContent).toContain(
      'T+30м',
    )
    expect(container.textContent).toContain('Авария выходит в городской эксплуатационный контур')
    expect(container.textContent).toContain('Что будет дальше')

    await act(async () => {
      container
        .querySelector('[data-testid="incident-replay-jump-t-zero"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="incident-replay-active-summary"]')?.textContent).toContain(
      'T-0',
    )
    expect(container.textContent).toContain('Аварийный прорыв участка')
    expect(container.textContent).toContain('аварийный инцидент')
    expect(container.textContent).toContain('Что нужно делать сейчас')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows a fallback state for a non-heat incident route', async () => {
    const root = await renderPage('/incidents/INC-1001/replay')

    expect(container.textContent).toContain('Воспроизведение пока доступно только для теплового контура')
    expect(container.querySelector('[data-testid="incident-replay-range"]')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })
})
