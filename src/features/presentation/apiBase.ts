const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '')

const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)

const runtimeBaseUrl = (): string => {
  const configuredBase = import.meta.env.VITE_PRESENTATION_API_BASE?.trim()
  const appBase = import.meta.env.BASE_URL ?? '/'

  if (configuredBase) {
    if (hasScheme(configuredBase)) {
      return trimTrailingSlash(configuredBase)
    }

    if (typeof window !== 'undefined') {
      return `${window.location.origin}${configuredBase.startsWith('/') ? configuredBase : `/${configuredBase}`}`
    }

    return configuredBase.startsWith('/') ? configuredBase : `/${configuredBase}`
  }

  if (typeof window !== 'undefined') {
    const normalizedBase = appBase === '/' ? '' : `/${trimLeadingSlash(trimTrailingSlash(appBase))}`
    return `${window.location.origin}${normalizedBase}`
  }

  return appBase === '/' ? '' : appBase
}

export const buildPresentationApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${runtimeBaseUrl()}${normalizedPath}`
}
