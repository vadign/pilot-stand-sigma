import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import IncidentPage from './IncidentPage'
import { createSigmaState, useSigmaStore } from '../../store/useSigmaStore'
import { createTestLiveBundle } from '../../testUtils/liveBundle'
import { incidentReplayCtaLabel } from '../incident-replay/availability'

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
  let electricityEmergencyIncidentId = ''
  const criticalNonEnergyIncidentId = 'INC-1001'
  const regularNonHeatIncidentId = 'INC-1002'

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
    electricityEmergencyIncidentId = useSigmaStore
      .getState()
      .live
      .liveIncidents
      .find((incident) => incident.utilityType === 'electricity' && incident.outageKind === 'emergency')
      ?.id ?? ''
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
  })

  it('shows the replay button on heat incidents', async () => {
    const root = await renderPage(`/incidents/${heatIncidentId}`)

    expect(container.textContent).toContain(incidentReplayCtaLabel)

    await act(async () => {
      root.unmount()
    })
  })

  it('hides the replay button on critical non-energy incidents', async () => {
    const root = await renderPage(`/incidents/${criticalNonEnergyIncidentId}`)

    expect(container.textContent).not.toContain(incidentReplayCtaLabel)

    await act(async () => {
      root.unmount()
    })
  })

  it('hides the replay button on regular non-energy incidents', async () => {
    const root = await renderPage(`/incidents/${regularNonHeatIncidentId}`)

    expect(container.textContent).not.toContain(incidentReplayCtaLabel)

    await act(async () => {
      root.unmount()
    })
  })

  it('hides the replay button on emergency electricity incidents', async () => {
    const root = await renderPage(`/incidents/${electricityEmergencyIncidentId}`)

    expect(container.textContent).not.toContain(incidentReplayCtaLabel)

    await act(async () => {
      root.unmount()
    })
  })
})
