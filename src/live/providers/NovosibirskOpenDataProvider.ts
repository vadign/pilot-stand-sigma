import { parseCsvDataset } from '../parsers/parseCsvDataset'
import { calculateActiveConstruction, aggregateConstructionByDistrict, normalizeCommissionedRecord, normalizePermitRecord } from '../normalizers/normalizeConstructionToSigma'
import type { ConstructionDatasetBundle, LiveSourceResult, OpendataDatasetMeta } from '../types'

const getBaseUrl = () => import.meta.env.VITE_OPENDATA_PROXY_URL || import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru'

export class NovosibirskOpenDataProvider {
  async fetchRuntime(): Promise<LiveSourceResult<ConstructionDatasetBundle>> {
    const baseUrl = getBaseUrl().replace(/\/$/, '')
    const permitsUrl = `${baseUrl}/datasets/124.csv`
    const commissionedUrl = `${baseUrl}/datasets/125.csv`
    const [permitsResponse, commissionedResponse] = await Promise.all([
      fetch(permitsUrl, { cache: 'no-store' }),
      fetch(commissionedUrl, { cache: 'no-store' }),
    ])
    if (!permitsResponse.ok || !commissionedResponse.ok) {
      throw new Error(`opendata runtime fetch failed: ${permitsResponse.status}/${commissionedResponse.status}`)
    }

    const fetchedAt = new Date().toISOString()
    const permitsRows = parseCsvDataset<Record<string, string>>(await permitsResponse.text()).map(normalizePermitRecord)
    const commissionedRows = parseCsvDataset<Record<string, string>>(await commissionedResponse.text()).map(normalizeCommissionedRecord)
    const active = calculateActiveConstruction(permitsRows, commissionedRows)
    const aggregates = aggregateConstructionByDistrict(permitsRows, commissionedRows, active)
    const baseMeta = (id: string, title: string, rows: number, sourceUrl: string): OpendataDatasetMeta => ({ id, title, passportUrl: `${baseUrl}/pass.aspx?ID=${id}`, csvUrl: sourceUrl, fetchedAt, rows, ttlMinutes: 60 * 24 })

    return {
      payload: {
        permitsMeta: baseMeta('124', 'Разрешения на строительство', permitsRows.length, permitsUrl),
        commissionedMeta: baseMeta('125', 'Ввод в эксплуатацию', commissionedRows.length, commissionedUrl),
        permits: permitsRows,
        commissioned: commissionedRows,
        active,
        aggregates,
      },
      meta: {
        source: 'runtime',
        type: 'real',
        fetchedAt,
        updatedAt: fetchedAt,
        sourceUrl: `${baseUrl}/pass.aspx?ID=124`,
        status: 'ready',
        message: 'OpenData успешно обновлен напрямую из браузера.',
      },
    }
  }
}
