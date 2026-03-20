import { parse051OffPage } from '../parsers/parse051OffPage'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import type { LiveSourceResult, Power051Snapshot } from '../types'

const getTargetUrl = () => import.meta.env.VITE_051_PROXY_URL || import.meta.env.VITE_051_URL || 'https://051.novo-sibirsk.ru/SitePages/off.aspx'

export class Power051Provider {
  async fetchRuntime(previousSnapshot?: Power051Snapshot): Promise<LiveSourceResult<{ snapshot: Power051Snapshot; incidents: ReturnType<typeof normalize051ToSigmaIncidents>; summary: ReturnType<typeof summarize051Snapshot> }>> {
    const sourceUrl = getTargetUrl()
    const response = await fetch(sourceUrl, { cache: 'no-store' })
    if (!response.ok) throw new Error(`051 runtime fetch failed: ${response.status}`)
    const html = await response.text()
    const parsed = parse051OffPage(html)
    const snapshot = build051Snapshot({
      sourceUrl,
      snapshotAt: parsed.snapshotAt,
      fetchedAt: new Date().toISOString(),
      parseVersion: '1.0.0',
      planned: parsed.planned,
      emergency: parsed.emergency,
    })
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
        sourceUrl,
        status: 'ready',
        message: 'Источник 051 успешно обновлен напрямую из браузера.',
      },
    }
  }
}
