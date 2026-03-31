import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../live/normalizers/normalize051ToSigma'
import type { LiveBundle } from '../live/types'

export const createTestLiveBundle = (): {
  bundle: LiveBundle
  heatIncidentId: string
} => {
  const snapshot = build051Snapshot({
    sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
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

  const incidents = normalize051ToSigmaIncidents(snapshot)
  const heatIncidentId = incidents.find((incident) => incident.subsystem === 'heat')?.id ?? incidents[0].id

  return {
    heatIncidentId,
    bundle: {
      mode: 'hybrid',
      outages: {
        payload: {
          snapshot,
          incidents,
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
    },
  }
}
