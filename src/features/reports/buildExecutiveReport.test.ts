import { describe, expect, it } from 'vitest'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../../live/normalizers/normalize051ToSigma'
import type { LiveIncidentView, SourceStatusCard } from '../../live/types'
import { buildExecutiveReportModel } from './buildExecutiveReport'

const toLiveIncidentViews = (
  snapshotAt: string,
): LiveIncidentView[] =>
  normalize051ToSigmaIncidents(currentSnapshot).map((incident) => ({
    ...incident,
    sourceKind: 'live' as const,
    sourceBadge: '051',
    dataType: 'real' as const,
    sourceUpdatedAt: snapshotAt,
    statusHint: incident.detail?.recoveryTime
      ? `Ожидаемое восстановление: ${incident.detail.recoveryTime}`
      : 'Данные уровня района',
    canArchive: false,
    canResolve: false,
    liveMeta: incident,
    workflowEntries: [],
  }))

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
      incidents: toLiveIncidentViews(currentSnapshot.snapshotAt),
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
      incidents: toLiveIncidentViews(currentSnapshot.snapshotAt),
      sourceStatus: readySource,
      sourceMode: 'hybrid',
    })

    expect(model.comparisonUnavailableReason).toContain('недостаточно')
    expect(model.summaryLines.join(' ')).toMatch(/сравнение/i)
    expect(model.deltaCards.find((item) => item.id === 'houses')?.value).toBe('—')
  })

  it('adds a fallback note when the source is stale mock-fallback data', () => {
    const model = buildExecutiveReportModel({
      summary: summarize051Snapshot(currentSnapshot),
      currentSnapshot,
      history: [currentSnapshot],
      incidents: toLiveIncidentViews(currentSnapshot.snapshotAt),
      sourceStatus: { ...readySource, status: 'stale', type: 'mock-fallback', source: 'mock' },
      sourceMode: 'mock',
    })

    expect(model.fallbackNote).toContain('резерв')
    expect(model.summaryLines.at(-1)).toContain('резерв')
  })
})
