import { normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import type { LiveSourceResult, Power051Snapshot } from '../types'
import { buildPower051SnapshotFromArcGis, fetchPower051ArcGisCollection, power051PortalUrl } from './power051ArcGis'

export class Power051Provider {
  async fetchRuntime(previousSnapshot?: Power051Snapshot): Promise<LiveSourceResult<{ snapshot: Power051Snapshot; incidents: ReturnType<typeof normalize051ToSigmaIncidents>; summary: ReturnType<typeof summarize051Snapshot> }>> {
    const raw = await fetchPower051ArcGisCollection()
    const snapshot = buildPower051SnapshotFromArcGis(raw, { sourceUrl: power051PortalUrl })
    return {
      payload: {
        snapshot,
        incidents: normalize051ToSigmaIncidents(snapshot),
        summary: summarize051Snapshot(snapshot, previousSnapshot),
      },
      meta: {
        source: 'runtime',
        type: 'real',
        fetchedAt: snapshot.fetchedAt,
        updatedAt: snapshot.snapshotAt,
        sourceUrl: power051PortalUrl,
        status: 'ready',
        message: 'Источник 051 обновлен сразу из резервной официальной карты МИС «Мой Новосибирск».',
      },
    }
  }
}
