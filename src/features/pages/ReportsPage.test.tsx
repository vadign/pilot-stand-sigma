import { beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportsPage from './ReportsPage'
import { createSigmaState, useSigmaStore } from '../../store/useSigmaStore'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'
import type { LiveBundle } from '../../live/types'

const createReportsBundle = (): LiveBundle => {
  const previousSnapshot = build051Snapshot({
    sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
    snapshotAt: '2026-03-19T09:30:00.000Z',
    fetchedAt: '2026-03-19T09:31:00.000Z',
    parseVersion: '1.0.0',
    planned: [{ district: 'Калининский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
    emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 1 }],
  })

  const snapshot = build051Snapshot({
    sourceUrl: previousSnapshot.sourceUrl,
    snapshotAt: '2026-03-20T09:30:00.000Z',
    fetchedAt: '2026-03-20T09:31:00.000Z',
    parseVersion: '1.0.0',
    planned: [
      { district: 'Калининский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 },
      { district: 'Калининский район', outageKind: 'planned', utilityType: 'heating', houses: 3 },
    ],
    emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 3 }],
  })

  return {
    mode: 'hybrid',
    outages: {
      payload: {
        snapshot,
        incidents: normalize051ToSigmaIncidents(snapshot),
        summary: summarize051Snapshot(snapshot, previousSnapshot),
        history: [previousSnapshot, snapshot],
      },
      meta: {
        source: 'snapshot',
        type: 'real',
        fetchedAt: snapshot.fetchedAt,
        updatedAt: snapshot.snapshotAt,
        sourceUrl: snapshot.sourceUrl,
        status: 'ready',
        message: 'snapshot',
      },
    },
    sourceStatuses: [
      {
        key: '051',
        title: '051 — отключения ЖКХ',
        sourceUrl: snapshot.sourceUrl,
        updatedAt: snapshot.snapshotAt,
        fetchedAt: snapshot.fetchedAt,
        ttlMinutes: 30,
        status: 'ready',
        type: 'real',
        message: 'snapshot',
        source: 'snapshot',
      },
    ],
  }
}

describe('ReportsPage', () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let container: HTMLDivElement

  const renderPage = async (path: string) => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/operations" element={<div>operations route</div>} />
            <Route path="/history" element={<div>history route</div>} />
            <Route path="/incidents/:id" element={<div>incident route</div>} />
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
    useSigmaStore.setState(createSigmaState(useSigmaStore.setState, useSigmaStore.getState), true)
    useSigmaStore.getState().applyLiveBundle(createReportsBundle())
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
  })

  it('renders the executive summary, delta block, and focus lists', async () => {
    const root = await renderPage('/reports')

    expect(container.textContent).toContain('Ежедневная сводка руководителя')
    expect(container.textContent).toContain('Что изменилось со вчера')
    expect(container.querySelector('[data-testid="reports-top-district"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="reports-priority-incident"]')).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
  })

  it('navigates to district, history, and incident detail routes from the report surface', async () => {
    let root = await renderPage('/reports')

    await act(async () => {
      container.querySelector('[data-testid="reports-top-district"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('operations route')

    await act(async () => {
      root.unmount()
    })

    root = await renderPage('/reports')

    await act(async () => {
      container.querySelector('[data-testid="reports-open-history"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('history route')

    await act(async () => {
      root.unmount()
    })

    root = await renderPage('/reports')

    await act(async () => {
      container.querySelector('[data-testid="reports-priority-incident"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('incident route')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows an empty state when there is no usable outage summary yet', async () => {
    useSigmaStore.setState(createSigmaState(useSigmaStore.setState, useSigmaStore.getState), true)

    const root = await renderPage('/reports')

    expect(container.textContent).toContain('Ежедневная сводка руководителя')
    expect(container.textContent).toContain('Сводка станет доступна')

    await act(async () => {
      root.unmount()
    })
  })
})
