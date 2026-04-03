const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '')

const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)
const normalizeBasePath = (value: string) => {
  const trimmed = trimTrailingSlash(value)
  if (!trimmed || trimmed === '/') return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const readEnv = (): Record<string, string | undefined> => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  return meta.env ?? {}
}

const runtimeBaseUrl = (): string => {
  const env = readEnv()
  const configuredBase = env.VITE_PRESENTATION_API_BASE?.trim()
  const appBase = env.BASE_URL ?? '/'

  if (configuredBase) {
    if (hasScheme(configuredBase)) {
      return trimTrailingSlash(configuredBase)
    }

    return normalizeBasePath(configuredBase)
  }

  return appBase === '/' ? '' : `/${trimLeadingSlash(trimTrailingSlash(appBase))}`
}

export const buildPresentationApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${runtimeBaseUrl()}${normalizedPath}`
}
