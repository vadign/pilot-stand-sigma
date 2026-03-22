import { parse051OffPage } from '../parsers/parse051OffPage'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'
import type { LiveSourceResult, Power051Snapshot } from '../types'

const DEFAULT_051_URL = 'https://051.novo-sibirsk.ru/SitePages/off.aspx'

const getFetchCandidates = (): string[] => {
  const directUrl = import.meta.env.VITE_051_URL || DEFAULT_051_URL
  const proxyUrl = import.meta.env.VITE_051_PROXY_URL
  return proxyUrl && proxyUrl !== directUrl ? [directUrl, proxyUrl] : [directUrl]
}

const fetchHtmlWithFallback = async (): Promise<{ html: string; sourceUrl: string }> => {
  const errors: string[] = []

  for (const candidate of getFetchCandidates()) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return { html: await response.text(), sourceUrl: candidate }
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`051 runtime fetch failed. ${errors.join(' | ')}`)
}

export class Power051Provider {
  async fetchRuntime(previousSnapshot?: Power051Snapshot): Promise<LiveSourceResult<{ snapshot: Power051Snapshot; incidents: ReturnType<typeof normalize051ToSigmaIncidents>; summary: ReturnType<typeof summarize051Snapshot> }>> {
    const { html, sourceUrl } = await fetchHtmlWithFallback()
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
        message: sourceUrl === getFetchCandidates()[0]
          ? 'Источник 051 успешно обновлен напрямую из браузера.'
          : 'Источник 051 обновлен через proxy fallback после неудачной прямой попытки.',
      },
    }
  }
}
