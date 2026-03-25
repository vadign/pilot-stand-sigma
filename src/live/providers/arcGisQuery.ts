export interface ArcGisFeatureCollection<TAttributes> {
  count?: number
  features?: Array<{
    attributes?: TAttributes
  }>
}

const defaultPageSize = 1000

const fetchArcGisJson = async <T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T> => {
  const response = await fetchImpl(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`ArcGIS fetch failed: ${response.status}`)
  return response.json() as Promise<T>
}

const buildArcGisUrl = (
  baseUrl: string,
  params: Record<string, string>,
  extraParams: Record<string, string> = {},
): string => {
  const url = new URL(baseUrl)

  for (const [key, value] of Object.entries({ ...params, ...extraParams })) {
    url.searchParams.set(key, value)
  }

  url.searchParams.set('f', 'pjson')
  return url.toString()
}

export const fetchArcGisFeatureCollection = async <TAttributes>(
  baseUrl: string,
  params: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<ArcGisFeatureCollection<TAttributes>> => {
  const countResponse = await fetchArcGisJson<{ count?: number }>(
    buildArcGisUrl(baseUrl, params, { returnCountOnly: 'true' }),
    fetchImpl,
  )
  const totalCount = countResponse.count ?? 0
  const features: NonNullable<ArcGisFeatureCollection<TAttributes>['features']> = []

  for (let offset = 0; offset < totalCount; offset += defaultPageSize) {
    const page = await fetchArcGisJson<ArcGisFeatureCollection<TAttributes>>(
      buildArcGisUrl(baseUrl, params, {
        resultOffset: String(offset),
        resultRecordCount: String(defaultPageSize),
      }),
      fetchImpl,
    )

    const pageFeatures = page.features ?? []
    if (pageFeatures.length === 0) break
    features.push(...pageFeatures)
  }

  return {
    count: totalCount,
    features,
  }
}
