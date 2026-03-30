import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../live/normalizers/normalize051ToSigma'
import type { LiveBundle } from '../live/types'
import { createSigmaState, type SigmaState } from './useSigmaStore'

const createTestStore = () => create<SigmaState>((set, get) => createSigmaState(set, get))

const createLiveBundle = (): LiveBundle => {
  const snapshot = build051Snapshot({
    sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
    snapshotAt: '2026-03-20T09:30:00.000Z',
    fetchedAt: '2026-03-20T09:31:00.000Z',
    parseVersion: '1.0.0',
    planned: [{ district: 'Ленинский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
    emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 3 }],
  })

  return {
    mode: 'hybrid',
    outages: {
      payload: {
        snapshot,
        incidents: normalize051ToSigmaIncidents(snapshot),
        summary: summarize051Snapshot(snapshot),
        history: [snapshot],
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

describe('useSigmaStore state factory', () => {
  it('mutates mock incidents directly for assignment and escalation', () => {
    const store = createTestStore()

    store.getState().assignIncident('INC-1000', 'Штаб района')
    const assigned = store.getState().incidents.find((incident) => incident.id === 'INC-1000')
    expect(assigned?.assignee).toBe('Штаб района')
    expect(assigned?.timeline.at(-1)?.text).toBe('Назначен: Штаб района')

    store.getState().escalateIncident('INC-1000')
    const escalated = store.getState().incidents.find((incident) => incident.id === 'INC-1000')
    expect(escalated?.status).toBe('эскалирован')
    expect(escalated?.timeline.at(-1)?.text).toBe('Инцидент эскалирован')
  })

  it('writes live actions into workflow overlay without mutating incident fixtures', () => {
    const store = createTestStore()
    store.getState().applyLiveBundle(createLiveBundle())
    const liveIncidentId = store.getState().live.liveIncidents[0]?.id

    expect(liveIncidentId).toMatch(/^051-/)

    store.getState().assignIncident(liveIncidentId!, 'Штаб района')
    store.getState().takeLiveIncident(liveIncidentId!, 'Штаб ЖКХ')
    store.getState().addTimeline(liveIncidentId!, 'Подтвержден районный уровень')

    const workflow = store.getState().live.workflow[liveIncidentId!]
    expect(workflow).toHaveLength(3)
    expect(workflow?.map((entry) => entry.action)).toEqual(['assign', 'take', 'comment'])
    expect(store.getState().incidents.some((incident) => incident.id === liveIncidentId)).toBe(false)
  })
})
