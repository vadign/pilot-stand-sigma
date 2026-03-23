import type { LiveTransportRoute, LiveTransportVehiclesResponse } from '../types'

const BASE_URL = 'https://maps.nskgortrans.ru/'
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'

interface NskgortransRouteGroup {
  type?: number | string
  ways?: Array<{
    marsh?: string
    name?: string
    stopb?: string
    stope?: string
  }>
}

interface NskgortransMarkersResponse {
  markers?: Array<{
    lat?: string | number
    lng?: string | number
    speed?: string | number
    azimuth?: string | number
    rasp?: string
  }>
}

const extractCookieHeader = (response: Response): string => {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie()
    if (values.length > 0) {
      return values.map((value) => value.split(';')[0]).join('; ')
    }
  }

  const fallback = response.headers.get('set-cookie')
  return fallback ? fallback.split(';')[0] : ''
}

export const flattenRoutes = (raw: NskgortransRouteGroup[]): LiveTransportRoute[] => {
  const routes: LiveTransportRoute[] = []

  raw.forEach((group) => {
    const type = Number(group.type ?? 0)

    group.ways?.forEach((way) => {
      const marsh = String(way.marsh ?? '').trim()
      const number = String(way.name ?? marsh).trim()
      if (!marsh || !number) return

      routes.push({
        routeId: `${type + 1}-${marsh}-W-${number}`,
        type,
        marsh,
        number,
        stopA: String(way.stopb ?? '').trim(),
        stopB: String(way.stope ?? '').trim(),
      })
    })
  })

  return routes.sort((left, right) => left.number.localeCompare(right.number, 'ru', { numeric: true }))
}

export const createNskgortransProxy = () => {
  let cookieHeader = ''
  let cookieFetchedAt = 0
  let handshakeReady = false

  const refreshCookie = async () => {
    const response = await fetch(BASE_URL, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    const parsedCookie = extractCookieHeader(response)
    cookieHeader = parsedCookie
    cookieFetchedAt = Date.now()
    handshakeReady = true
  }

  const ensureCookie = async () => {
    const expired = Date.now() - cookieFetchedAt > 10 * 60 * 1000
    if (!handshakeReady || expired) {
      await refreshCookie()
    }
  }

  const ngFetch = async <T>(relativeUrl: string, retry = true): Promise<T> => {
    await ensureCookie()

    const response = await fetch(new URL(relativeUrl, BASE_URL), {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: BASE_URL,
        'X-Requested-With': 'XMLHttpRequest',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        Accept: 'application/json,text/plain,*/*',
      },
    })

    if ((response.status === 401 || response.status === 403) && retry) {
      await refreshCookie()
      return ngFetch<T>(relativeUrl, false)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`NG fetch failed: ${response.status} ${text.slice(0, 200)}`)
    }

    return response.json() as Promise<T>
  }

  return {
    async getRoutes(): Promise<LiveTransportRoute[]> {
      const raw = await ngFetch<NskgortransRouteGroup[]>('listmarsh.php?r=')
      return flattenRoutes(raw)
    },

    async getVehicles(routeId: string): Promise<LiveTransportVehiclesResponse> {
      const raw = await ngFetch<NskgortransMarkersResponse>(`markers.php?r=${encodeURIComponent(routeId)}|`)
      const updatedAt = new Date().toISOString()
      const routeNumber = routeId.split('-W-').at(-1) ?? routeId

      return {
        routeId,
        updatedAt,
        vehicles: (raw.markers ?? []).map((marker, index) => ({
          id: `${routeId}:${index}:${marker.lat}:${marker.lng}`,
          lat: Number(marker.lat ?? 0),
          lon: Number(marker.lng ?? 0),
          route: routeNumber,
          speed: Number(marker.speed ?? 0),
          azimuth: Number(marker.azimuth ?? 0),
          timetable: marker.rasp ?? '',
          updatedAt,
        })),
      }
    },
  }
}
