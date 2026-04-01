export const PRESENTATION_SESSION_PARAM = 's'
export const PRESENTATION_MODE_PARAM = 'present'
const localhostHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

export const getPresentationSessionId = (searchParams: URLSearchParams): string | undefined =>
  searchParams.get(PRESENTATION_SESSION_PARAM) ?? undefined

export const isPresentationPageMode = (searchParams: URLSearchParams): boolean =>
  searchParams.get(PRESENTATION_MODE_PARAM) === '1' && Boolean(getPresentationSessionId(searchParams))

export const buildMobileRoute = (sid: string): string =>
  `/mobile?${PRESENTATION_SESSION_PARAM}=${encodeURIComponent(sid)}`

export const buildDisplayRoute = (sid: string): string => `/display?${PRESENTATION_SESSION_PARAM}=${encodeURIComponent(sid)}`

export const buildFallbackMobileUrl = (
  sid: string,
  locationLike: Pick<Location, 'origin' | 'hostname'> = window.location,
): string | undefined => {
  if (localhostHosts.has(locationLike.hostname)) return undefined
  return new URL(buildMobileRoute(sid), locationLike.origin).toString()
}

export const buildPresentationRoute = (route: string, sid: string): string => {
  const url = new URL(route, window.location.origin)
  url.searchParams.set(PRESENTATION_MODE_PARAM, '1')
  url.searchParams.set(PRESENTATION_SESSION_PARAM, sid)
  return `${url.pathname}${url.search}${url.hash}`
}
