# Reports Executive Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/reports` screen with a live, deterministic executive briefing for 051/ЖКХ that shows current state, previous-snapshot deltas, and drilldown links into existing detail routes.

**Architecture:** Add a pure report view-model builder under `src/features/reports/` that converts existing live 051 store data into deterministic summary lines, delta cards, fallback notes, and prioritized drilldown lists. Render that model in a new `ReportsPage`, wire `/reports` as the primary desktop navigation target, and leave the legacy `/briefing` route untouched so presentation and Ask Sigma flows keep working during this first iteration.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, Vitest, existing Sigma UI cards/badges, existing live 051 normalizers/selectors.

---

## File Structure

- `src/features/reports/buildExecutiveReport.ts`
  Pure helper that turns current live 051 state into a page-ready executive report model.

- `src/features/reports/buildExecutiveReport.test.ts`
  Unit coverage for deterministic summary text, delta math, missing-history behavior, and fallback notes.

- `src/features/pages/ReportsPage.tsx`
  New route component for the executive briefing UI and drilldown navigation.

- `src/features/pages/ReportsPage.test.tsx`
  Page-level tests for rendering `/reports`, empty state behavior, and drilldown navigation.

- `src/App.tsx`
  Route registration for `/reports`.

- `src/components/Layout.tsx`
  Desktop navigation points “Управленческий отчет” to `/reports` instead of the legacy `/briefing`.

- `src/App.test.tsx`
  App-level route smoke and desktop-nav href assertion for `/reports`.

- `src/features/pages/index.ts`
  Keeps page exports aligned with the new page file.

- `src/features/pages.tsx`
  Keeps the secondary page export surface aligned with the new page file.

- `README.md`
  Updates the user-facing route list to mention `/reports` as the executive briefing surface.

## Task 1: Build The Deterministic Report Model

**Files:**
- Create: `src/features/reports/buildExecutiveReport.ts`
- Create: `src/features/reports/buildExecutiveReport.test.ts`

- [ ] **Step 1: Write failing unit tests for summary, delta, and fallback behavior**

```ts
import { describe, expect, it } from 'vitest'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'
import type { SourceStatusCard } from '../../live/types'
import { buildExecutiveReportModel } from './buildExecutiveReport'

const previousSnapshot = build051Snapshot({
  sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
  snapshotAt: '2026-03-19T09:30:00.000Z',
  fetchedAt: '2026-03-19T09:31:00.000Z',
  parseVersion: '1.0.0',
  planned: [{ district: 'Калининский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
  emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 1 }],
})

const currentSnapshot = build051Snapshot({
  sourceUrl: previousSnapshot.sourceUrl,
  snapshotAt: '2026-03-20T09:30:00.000Z',
  fetchedAt: '2026-03-20T09:31:00.000Z',
  parseVersion: '1.0.0',
  planned: [
    { district: 'Калининский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 },
    { district: 'Калининский район', outageKind: 'planned', utilityType: 'heating', houses: 3 },
  ],
  emergency: [
    { district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 3 },
    { district: 'Кировский район', outageKind: 'emergency', utilityType: 'electricity', houses: 1 },
  ],
})

const readySource: SourceStatusCard = {
  key: '051',
  title: '051 — отключения ЖКХ',
  sourceUrl: currentSnapshot.sourceUrl,
  updatedAt: currentSnapshot.snapshotAt,
  fetchedAt: currentSnapshot.fetchedAt,
  ttlMinutes: 30,
  status: 'ready',
  type: 'real',
  message: 'snapshot',
  source: 'snapshot',
}

describe('buildExecutiveReportModel', () => {
  it('builds deterministic summary lines and signed delta cards from live 051 data', () => {
    const model = buildExecutiveReportModel({
      summary: summarize051Snapshot(currentSnapshot, previousSnapshot),
      currentSnapshot,
      history: [previousSnapshot, currentSnapshot],
      incidents: normalize051ToSigmaIncidents(currentSnapshot),
      sourceStatus: readySource,
      sourceMode: 'hybrid',
    })

    expect(model.summaryLines[0]).toContain('4 активных')
    expect(model.summaryLines[1]).toContain('Калинин')
    expect(model.deltaCards.find((item) => item.id === 'houses')?.value).toBe('+6')
    expect(model.deltaCards.find((item) => item.id === 'district')?.caption).toContain('Калинин')
    expect(model.comparisonUnavailableReason).toBeUndefined()
  })

  it('marks comparison as unavailable when there is no previous snapshot', () => {
    const model = buildExecutiveReportModel({
      summary: summarize051Snapshot(currentSnapshot),
      currentSnapshot,
      history: [currentSnapshot],
      incidents: normalize051ToSigmaIncidents(currentSnapshot),
      sourceStatus: readySource,
      sourceMode: 'hybrid',
    })

    expect(model.comparisonUnavailableReason).toContain('недостаточно')
    expect(model.summaryLines.join(' ')).toContain('сравнение')
    expect(model.deltaCards.find((item) => item.id === 'houses')?.value).toBe('—')
  })

  it('adds a fallback note when the source is stale mock-fallback data', () => {
    const model = buildExecutiveReportModel({
      summary: summarize051Snapshot(currentSnapshot),
      currentSnapshot,
      history: [currentSnapshot],
      incidents: normalize051ToSigmaIncidents(currentSnapshot),
      sourceStatus: { ...readySource, status: 'stale', type: 'mock-fallback', source: 'mock' },
      sourceMode: 'mock',
    })

    expect(model.fallbackNote).toContain('резерв')
    expect(model.summaryLines.at(-1)).toContain('резерв')
  })
})
```

- [ ] **Step 2: Run the new unit tests to verify they fail for missing implementation**

Run: `npm test -- src/features/reports/buildExecutiveReport.test.ts`

Expected: FAIL with `Cannot find module './buildExecutiveReport'` or missing export/function errors.

- [ ] **Step 3: Implement the pure executive report builder**

```ts
import { formatSourceModeLabel, formatSourceOriginLabel, formatSourceStatusLabel } from '../../lib/sourcePresentation'
import { summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'
import type {
  LiveIncidentView,
  LiveSourceMode,
  Power051Snapshot,
  SigmaLiveOutageSummary,
  SourceStatusCard,
} from '../../live/types'
import { sortIncidentsByPriority } from '../pages/shared'

export interface ExecutiveReportModel {
  title: string
  subtitle: string
  updatedAt?: string
  sourceLabel: string
  sourceStatusLabel: string
  sourceModeLabel: string
  summaryLines: string[]
  fallbackNote?: string
  kpis: Array<{ id: string; label: string; value: number | string; caption: string; tone?: 'critical' | 'warning' | 'neutral' }>
  deltaCards: Array<{ id: string; label: string; value: string; caption: string }>
  comparisonUnavailableReason?: string
  topDistricts: Array<{ district: string; houses: number; incidents: number }>
  priorityIncidents: LiveIncidentView[]
}

const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${value}`
const formatDeltaValue = (value?: number) => value === undefined ? '—' : formatSigned(value)

const pickPreviousSnapshot = (
  history: Power051Snapshot[],
  currentSnapshotAt?: string,
): Power051Snapshot | undefined =>
  [...history]
    .filter((snapshot) => snapshot.snapshotAt !== currentSnapshotAt)
    .sort((left, right) => new Date(right.snapshotAt).getTime() - new Date(left.snapshotAt).getTime())[0]

const formatSourceHost = (sourceUrl?: string): string => {
  if (!sourceUrl) return '—'
  try {
    return new URL(sourceUrl).host
  } catch {
    return sourceUrl
  }
}

export const buildExecutiveReportModel = ({
  summary,
  currentSnapshot,
  history,
  incidents,
  sourceStatus,
  sourceMode,
}: {
  summary?: SigmaLiveOutageSummary
  currentSnapshot?: Power051Snapshot
  history: Power051Snapshot[]
  incidents: LiveIncidentView[]
  sourceStatus?: SourceStatusCard
  sourceMode: LiveSourceMode
}): ExecutiveReportModel => {
  const liveIncidents = incidents.filter((incident) => incident.sourceKind === 'live')
  const emergencyIncidents = liveIncidents.filter((incident) => incident.liveMeta?.outageKind === 'emergency')
  const priorityIncidents = sortIncidentsByPriority(liveIncidents).slice(0, 5)
  const previousSnapshot = pickPreviousSnapshot(history, currentSnapshot?.snapshotAt)
  const previousSummary = previousSnapshot ? summarize051Snapshot(previousSnapshot) : undefined
  const topDistrict = summary?.topDistricts[0]?.district ?? 'без выраженного лидера'
  const sourceLabel = formatSourceHost(sourceStatus?.sourceUrl)
  const sourceStatusLabel = formatSourceStatusLabel(sourceStatus?.status)
  const sourceModeLabel = formatSourceModeLabel(sourceMode)
  const fallbackNote = sourceStatus && (sourceStatus.source !== 'runtime' || sourceStatus.type === 'mock-fallback')
    ? `Данные показаны из резервного источника: ${formatSourceOriginLabel(sourceStatus.source)}.`
    : undefined

  const summaryLines = [
    `Сейчас в городе ${summary?.activeIncidents ?? 0} активных отключения, из них ${emergencyIncidents.length} экстренных.`,
    `Наибольшая текущая нагрузка по домам наблюдается в ${topDistrict}.`,
    summary?.delta
      ? `По сравнению с предыдущим снимком число отключённых домов изменилось на ${formatSigned(summary.delta.houses)}.`
      : 'Сравнение с предыдущим снимком пока недоступно: история 051 ещё недостаточна.',
    priorityIncidents.length > 0
      ? `В фокусе остаются ${priorityIncidents.slice(0, 2).map((incident) => incident.title).join(' и ')}.`
      : 'В live-контуре сейчас нет инцидентов, требующих отдельного приоритетного разбора.',
    ...(fallbackNote ? [fallbackNote] : []),
  ]

  const districtDeltaCaption = previousSummary?.topDistricts[0]?.district && previousSummary.topDistricts[0].district !== topDistrict
    ? `Лидер сместился с ${previousSummary.topDistricts[0].district} на ${topDistrict}.`
    : `${topDistrict} удерживает максимальную нагрузку.`

  return {
    title: 'Ежедневная сводка руководителя',
    subtitle: 'ЖКХ и отключения 051 на текущий момент с сопоставлением к предыдущему снимку.',
    updatedAt: sourceStatus?.updatedAt ?? currentSnapshot?.snapshotAt,
    sourceLabel,
    sourceStatusLabel,
    sourceModeLabel,
    summaryLines,
    fallbackNote,
    kpis: [
      { id: 'active', label: 'Активные отключения', value: summary?.activeIncidents ?? 0, caption: 'текущий live-контур' },
      { id: 'houses', label: 'Отключено домов', value: summary?.totalHouses ?? 0, caption: 'суммарная текущая нагрузка' },
      { id: 'emergency', label: 'Экстренный контур', value: summary?.emergencyHouses ?? 0, caption: 'домов в экстренных событиях', tone: 'critical' },
      { id: 'district', label: 'Лидирующий район', value: topDistrict, caption: 'по числу отключённых домов', tone: 'warning' },
    ],
    deltaCards: [
      { id: 'incidents', label: 'Активные события', value: formatDeltaValue(summary?.delta?.incidents), caption: 'к предыдущему снимку' },
      { id: 'houses', label: 'Отключено домов', value: formatDeltaValue(summary?.delta?.houses), caption: 'изменение общей нагрузки' },
      { id: 'emergency', label: 'Экстренный контур', value: formatDeltaValue(summary?.delta?.emergency), caption: 'изменение экстренных домов' },
      { id: 'district', label: 'Район-лидер', value: topDistrict, caption: districtDeltaCaption },
    ],
    comparisonUnavailableReason: summary?.delta ? undefined : 'Для сравнения с предыдущим снимком 051 пока недостаточно накопленной истории.',
    topDistricts: summary?.topDistricts ?? [],
    priorityIncidents,
  }
}
```

- [ ] **Step 4: Re-run the unit tests and confirm the model behavior**

Run: `npm test -- src/features/reports/buildExecutiveReport.test.ts`

Expected: PASS with 3 passing tests for summary generation, missing-history behavior, and fallback note handling.

- [ ] **Step 5: Commit the pure report model**

```bash
git add src/features/reports/buildExecutiveReport.ts src/features/reports/buildExecutiveReport.test.ts
git commit -m "feat: add executive report view model"
```

## Task 2: Implement The `/reports` Page And Page-Level Tests

**Files:**
- Create: `src/features/pages/ReportsPage.tsx`
- Create: `src/features/pages/ReportsPage.test.tsx`

- [ ] **Step 1: Write failing page tests for rendering and drilldown navigation**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportsPage from './ReportsPage'
import { createSigmaState, useSigmaStore } from '../../store/useSigmaStore'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'

const createReportsBundle = () => {
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
    mode: 'hybrid' as const,
    outages: {
      payload: {
        snapshot,
        incidents: normalize051ToSigmaIncidents(snapshot),
        summary: summarize051Snapshot(snapshot, previousSnapshot),
        history: [previousSnapshot, snapshot],
      },
      meta: {
        source: 'snapshot' as const,
        type: 'real' as const,
        fetchedAt: snapshot.fetchedAt,
        updatedAt: snapshot.snapshotAt,
        sourceUrl: snapshot.sourceUrl,
        status: 'ready' as const,
        message: 'snapshot',
      },
    },
    sourceStatuses: [
      {
        key: '051' as const,
        title: '051 — отключения ЖКХ',
        sourceUrl: snapshot.sourceUrl,
        updatedAt: snapshot.snapshotAt,
        fetchedAt: snapshot.fetchedAt,
        ttlMinutes: 30,
        status: 'ready' as const,
        type: 'real' as const,
        message: 'snapshot',
        source: 'snapshot' as const,
      },
    ],
  }
}

describe('ReportsPage', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    useSigmaStore.setState(createSigmaState(useSigmaStore.setState, useSigmaStore.getState), true)
    useSigmaStore.getState().applyLiveBundle(createReportsBundle())
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
  })

  it('renders the executive summary, delta block, and focus lists', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/reports']}>
          <Routes>
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Ежедневная сводка руководителя')
    expect(container.textContent).toContain('Что изменилось со вчера')
    expect(container.querySelector('[data-testid="reports-top-district"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="reports-priority-incident"]')).toBeTruthy()
  })

  it('navigates from district, history, and incident actions into detail routes', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/reports']}>
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
      container.querySelector('[data-testid="reports-top-district"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('operations route')

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/reports']}>
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
      container.querySelector('[data-testid="reports-open-history"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('history route')

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/reports']}>
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
      container.querySelector('[data-testid="reports-priority-incident"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('incident route')
  })
})
```

- [ ] **Step 2: Run the page tests to verify they fail before the page exists**

Run: `npm test -- src/features/pages/ReportsPage.test.tsx`

Expected: FAIL with `Cannot find module './ReportsPage'` or missing test selectors.

- [ ] **Step 3: Implement the new route component with deterministic sections and drilldown buttons**

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Card, SectionTitle, SourceMetaFooter } from '../../components/ui'
import { formatSourceOriginLabel } from '../../lib/sourcePresentation'
import { useSigmaStore } from '../../store/useSigmaStore'
import { useDashboardData, severityStyles } from './shared'
import { buildExecutiveReportModel } from '../reports/buildExecutiveReport'

const toneClassName: Record<'critical' | 'warning' | 'neutral', string> = {
  critical: 'text-red-600',
  warning: 'text-amber-600',
  neutral: 'text-slate-900',
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const sourceMode = useSigmaStore((state) => state.live.mode)
  const { incidents, outageSummary, sourceStatuses, live } = useDashboardData()
  const sourceStatus = sourceStatuses.find((item) => item.key === '051')
  const report = buildExecutiveReportModel({
    summary: outageSummary,
    currentSnapshot: live.outages?.payload.snapshot,
    history: live.liveHistory,
    incidents,
    sourceStatus,
    sourceMode,
  })

  if (!outageSummary || !sourceStatus) {
    return (
      <Card>
        <SectionTitle
          title="Ежедневная сводка руководителя"
          subtitle="Сводка станет доступна, когда в live-контуре 051 появятся пригодные данные."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title={report.title} subtitle={report.subtitle} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge text={`Источник: ${report.sourceLabel}`} />
          <Badge text={`Режим: ${report.sourceModeLabel}`} />
          <Badge text={`Статус: ${report.sourceStatusLabel}`} />
          <Badge text={`Контур: ${formatSourceOriginLabel(sourceStatus.source)}`} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-2xl font-bold">Executive summary</div>
        <div className="space-y-2 text-base leading-relaxed text-slate-700 lg:text-lg">
          {report.summaryLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.kpis.map((item) => (
          <Card key={item.id}>
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className={`mt-2 text-4xl font-bold ${toneClassName[item.tone ?? 'neutral']}`}>
              {item.value}
            </div>
            <div className="mt-2 text-sm text-slate-500">{item.caption}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">Что изменилось со вчера</div>
            {report.comparisonUnavailableReason && (
              <div className="mt-1 text-sm text-slate-500">{report.comparisonUnavailableReason}</div>
            )}
          </div>
          <button
            type="button"
            data-testid="reports-open-history"
            onClick={() => navigate('/history')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            Открыть историю
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {report.deltaCards.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-3xl font-bold text-blue-700">{item.value}</div>
              <div className="mt-2 text-sm text-slate-500">{item.caption}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="mb-3 text-2xl font-bold">Точки внимания по районам</div>
          <div className="space-y-2">
            {report.topDistricts.slice(0, 5).map((district) => (
              <button
                key={district.district}
                type="button"
                data-testid="reports-top-district"
                onClick={() => navigate(`/operations?district=${encodeURIComponent(district.district)}`)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{district.district}</span>
                  <span className="text-sm text-slate-500">{district.incidents} событий</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">Отключённых домов: {district.houses}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <div className="mb-3 text-2xl font-bold">Приоритетные инциденты</div>
          <div className="space-y-2">
            {report.priorityIncidents.map((incident) => (
              <button
                key={incident.id}
                type="button"
                data-testid="reports-priority-incident"
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{incident.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{incident.summary}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}>
                  {incident.severity}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <SourceMetaFooter
        source={report.sourceLabel}
        updatedAt={report.updatedAt}
        ttl={`${sourceStatus.ttlMinutes} мин`}
        type={sourceStatus.type}
        status={sourceStatus.status}
      />
    </div>
  )
}
```

- [ ] **Step 4: Re-run the page tests and confirm the UI contract**

Run: `npm test -- src/features/pages/ReportsPage.test.tsx`

Expected: PASS with render coverage for the summary/delta sections and navigation from at least one drilldown action.

- [ ] **Step 5: Commit the page implementation**

```bash
git add src/features/pages/ReportsPage.tsx src/features/pages/ReportsPage.test.tsx
git commit -m "feat: add reports executive briefing page"
```

## Task 3: Wire The Route, Navigation, Exports, And Docs

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/features/pages/index.ts`
- Modify: `src/features/pages.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add failing app-level smoke coverage for `/reports` and the desktop nav target**

```ts
it('renders the reports route without crashing to a blank screen', async () => {
  const root = await renderApp(['/reports'])
  await waitForText('Ежедневная сводка руководителя')

  expect(container.textContent).toContain('Что изменилось со вчера')
  expect(container.textContent).toContain('Приоритетные инциденты')

  await act(async () => {
    root.unmount()
  })
})

it('points the desktop executive report navigation link to /reports', async () => {
  const root = await renderApp(['/mayor-dashboard'])
  await waitForText('ЖКХ и энергетика под управлением оперативных источников')

  const reportLink = Array.from(container.querySelectorAll('a')).find(
    (link) => link.textContent?.trim() === 'Управленческий отчет',
  )

  expect(reportLink?.getAttribute('href')).toBe('/reports')

  await act(async () => {
    root.unmount()
  })
})
```

- [ ] **Step 2: Run the app-level test slice and verify it fails before wiring**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `/reports` still renders the placeholder page and the nav link still points to `/briefing`.

- [ ] **Step 3: Register the page, switch desktop nav, keep legacy `/briefing`, and update route docs**

```tsx
// src/App.tsx
const ReportsPage = lazy(() => import('./features/pages/ReportsPage'))

// keep this route untouched for presentation/Ask Sigma compatibility
<Route path="/briefing" element={renderLazyRoute(BriefingPage)} />
<Route path="/reports" element={renderLazyRoute(ReportsPage)} />
```

```tsx
// src/components/Layout.tsx
const nav = [
  ['/mayor-dashboard', 'Панель мэра'],
  ['/reports', 'Управленческий отчет'],
  ['/history', 'История и аналитика'],
  ['/display', 'Режим демонстрации'],
]
```

```ts
// src/features/pages/index.ts
export { default as ReportsPage } from './ReportsPage'
```

```ts
// src/features/pages.tsx
export { default as ReportsPage } from './pages/ReportsPage'
```

```md
<!-- README.md -->
- `/reports` — ежедневная live-сводка для руководства по 051: текущее состояние, дельта к предыдущему снимку и быстрые переходы в детали.
```

- [ ] **Step 4: Re-run the app-level test slice and confirm the route wiring**

Run: `npm test -- src/App.test.tsx`

Expected: PASS with the new `/reports` route rendering and the desktop nav entry pointing to `/reports`.

- [ ] **Step 5: Commit route wiring and docs**

```bash
git add src/App.tsx src/components/Layout.tsx src/App.test.tsx src/features/pages/index.ts src/features/pages.tsx README.md
git commit -m "feat: wire reports route and navigation"
```

## Task 4: Run Full Verification And Browser Smoke

**Files:**
- Modify: none

- [ ] **Step 1: Run lint across the repository**

Run: `npm run lint`

Expected: PASS with no ESLint errors.

- [ ] **Step 2: Run the full automated test suite**

Run: `npm test`

Expected: PASS including the new report model tests, page tests, and app smoke tests.

- [ ] **Step 3: Run a production build**

Run: `npm run build`

Expected: PASS with the Vite production bundle generated successfully.

- [ ] **Step 4: Run a browser smoke check for `/reports`**

Run: `npm run dev`

Expected: local dev server starts successfully.

Then use Playwright MCP to open `http://localhost:5173/reports` and confirm:

1. The header shows `Ежедневная сводка руководителя`.
2. The page shows `Что изменилось со вчера`.
3. At least one district drilldown and one incident drilldown button are visible.
4. Clicking a drilldown opens the expected detail route instead of leaving the user on a dead surface.
