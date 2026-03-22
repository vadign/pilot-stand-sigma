import { parseCsvDataset } from '../parsers/parseCsvDataset'
import { parseOpendataPassport } from '../parsers/parseOpendataPassport'
import { calculateActiveConstruction, aggregateConstructionByDistrict, normalizeCommissionedRecord, normalizePermitRecord } from '../normalizers/normalizeConstructionToSigma'
import type { ConstructionDatasetBundle, LiveSourceResult, OpendataDatasetMeta } from '../types'

const DEFAULT_BASE_URL = 'https://opendata.novo-sibirsk.ru'

const getBaseCandidates = (): string[] => {
  const directBase = (import.meta.env.VITE_OPENDATA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const proxyBase = import.meta.env.VITE_OPENDATA_PROXY_URL?.replace(/\/$/, '')
  return proxyBase && proxyBase !== directBase ? [directBase, proxyBase] : [directBase]
}

const fetchTextFromCandidates = async (path: string): Promise<{ body: string; baseUrl: string }> => {
  const errors: string[] = []

  for (const baseUrl of getBaseCandidates()) {
    const url = `${baseUrl}${path}`
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return { body: await response.text(), baseUrl }
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`opendata runtime fetch failed. ${errors.join(' | ')}`)
}

export class NovosibirskOpenDataProvider {
  async fetchRuntime(): Promise<LiveSourceResult<ConstructionDatasetBundle>> {
    const [passport124Result, passport125Result, permitsCsvResult, commissionedCsvResult] = await Promise.all([
      fetchTextFromCandidates('/pass.aspx?ID=124'),
      fetchTextFromCandidates('/pass.aspx?ID=125'),
      fetchTextFromCandidates('/datasets/124.csv'),
      fetchTextFromCandidates('/datasets/125.csv'),
    ])

    const baseUrl = passport124Result.baseUrl
    const fetchedAt = new Date().toISOString()
    const permitPassport = parseOpendataPassport(passport124Result.body, baseUrl)
    const commissionedPassport = parseOpendataPassport(passport125Result.body, baseUrl)
    const permitsRows = parseCsvDataset<Record<string, string>>(permitsCsvResult.body).map(normalizePermitRecord)
    const commissionedRows = parseCsvDataset<Record<string, string>>(commissionedCsvResult.body).map(normalizeCommissionedRecord)
    const active = calculateActiveConstruction(permitsRows, commissionedRows)
    const aggregates = aggregateConstructionByDistrict(permitsRows, commissionedRows, active)
    const primaryBaseUrl = getBaseCandidates()[0]
    const usedProxyFallback = baseUrl !== primaryBaseUrl
    const baseMeta = (id: string, title: string, rows: number, passportUrl: string, csvUrl?: string, updatedAt?: string): OpendataDatasetMeta => ({
      id,
      title,
      passportUrl,
      csvUrl,
      updatedAt,
      fetchedAt,
      rows,
      ttlMinutes: 60 * 24,
    })

    return {
      payload: {
        permitsMeta: baseMeta('124', permitPassport.title, permitsRows.length, `${baseUrl}/pass.aspx?ID=124`, permitPassport.csvUrl, permitPassport.updatedAt),
        commissionedMeta: baseMeta('125', commissionedPassport.title, commissionedRows.length, `${baseUrl}/pass.aspx?ID=125`, commissionedPassport.csvUrl, commissionedPassport.updatedAt),
        permits: permitsRows,
        commissioned: commissionedRows,
        active,
        aggregates,
      },
      meta: {
        source: 'runtime',
        type: 'real',
        fetchedAt,
        updatedAt: permitPassport.updatedAt ?? fetchedAt,
        sourceUrl: `${baseUrl}/pass.aspx?ID=124`,
        status: 'ready',
        message: usedProxyFallback
          ? 'OpenData обновлен через proxy fallback после неудачной прямой попытки.'
          : 'OpenData успешно обновлен напрямую из браузера.',
      },
    }
  }
}
