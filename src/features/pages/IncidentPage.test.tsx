import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import IncidentPage from './IncidentPage'
import { createSigmaState, useSigmaStore } from '../../store/useSigmaStore'
import { createTestLiveBundle } from '../../testUtils/liveBundle'

vi.mock('../../components/MapView', () => ({
  MapView: () => <div data-testid="mock-incident-map">map</div>,
}))

const resetStore = () => {
  useSigmaStore.setState(createSigmaState(useSigmaStore.setState, useSigmaStore.getState), true)
  useSigmaStore.getState().applyLiveBundle(createTestLiveBundle().bundle)
}

describe('IncidentPage replay entry point', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement
  let heatIncidentId = ''

  const renderPage = async (path: string) => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/incidents/:id" element={<IncidentPage />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    await act(async () => {
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

  it('shows the replay button on heat incidents', async () => {
    const root = await renderPage(`/incidents/${heatIncidentId}`)

    expect(container.textContent).toContain('Открыть воспроизведение и прогноз')

    await act(async () => {
      root.unmount()
    })
  })

  it('hides the replay button on non-heat incidents', async () => {
    const root = await renderPage('/incidents/INC-1001')

    expect(container.textContent).not.toContain('Открыть воспроизведение и прогноз')

    await act(async () => {
      root.unmount()
    })
  })
})
