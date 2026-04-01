export const PRESENTATION_SESSION_PARAM = 's'
export const PRESENTATION_MODE_PARAM = 'present'

export const getPresentationSessionId = (searchParams: URLSearchParams): string | undefined =>
  searchParams.get(PRESENTATION_SESSION_PARAM) ?? undefined

export const isPresentationPageMode = (searchParams: URLSearchParams): boolean =>
  searchParams.get(PRESENTATION_MODE_PARAM) === '1' && Boolean(getPresentationSessionId(searchParams))

export const buildDisplayRoute = (sid: string): string => `/display?${PRESENTATION_SESSION_PARAM}=${encodeURIComponent(sid)}`

export const buildPresentationRoute = (route: string, sid: string): string => {
  const url = new URL(route, window.location.origin)
  url.searchParams.set(PRESENTATION_MODE_PARAM, '1')
  url.searchParams.set(PRESENTATION_SESSION_PARAM, sid)
  return `${url.pathname}${url.search}${url.hash}`
}
