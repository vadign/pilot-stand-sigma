import type {
  PresentationAskRequest,
  PresentationCommandRequest,
  PresentationControllerConflict,
  PresentationCreateSessionResponse,
  PresentationPresentRequest,
  PresentationRole,
  PresentationSessionInfo,
} from './types'

export class PresentationControllerConflictError extends Error {
  controller?: PresentationControllerConflict['controller']

  constructor(conflict: PresentationControllerConflict) {
    super('Controller conflict')
    this.name = 'PresentationControllerConflictError'
    this.controller = conflict.controller
  }
}

const ERROR_PREVIEW_LENGTH = 180

const isJsonContentType = (contentType: string | null): boolean => {
  if (!contentType) return false
  const normalized = contentType.toLowerCase()
  return normalized.includes('application/json') || normalized.includes('+json')
}

const buildResponseError = (response: Response, rawText: string): Error => {
  const normalizedBody = rawText.trim()
  const bodyPreview = normalizedBody.slice(0, ERROR_PREVIEW_LENGTH)
  const bodyFragment = bodyPreview
    ? ` — ${bodyPreview}${normalizedBody.length > ERROR_PREVIEW_LENGTH ? '…' : ''}`
    : ' — пустой ответ'

  return new Error(`Request failed: ${response.status} ${response.statusText}${bodyFragment}`)
}

const readJson = async <T>(response: Response): Promise<T> => {
  const rawText = await response.text()
  const shouldParseJson = isJsonContentType(response.headers.get('content-type'))

  let payload: T | { error?: string } | undefined
  if (shouldParseJson && rawText) {
    payload = JSON.parse(rawText) as T | { error?: string }
  }

  if (!response.ok) {
    if (response.status === 409 && payload && typeof payload === 'object' && 'error' in payload) {
      throw new PresentationControllerConflictError(payload as PresentationControllerConflict)
    }

    if (payload && typeof payload === 'object' && 'error' in payload) {
      throw new Error(String(payload.error))
    }

    throw buildResponseError(response, rawText)
  }

  if (!shouldParseJson) {
    throw buildResponseError(response, rawText)
  }

  if (!payload) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} — пустой ответ`)
  }

  return payload as T
}

export const createPresentationSession = async (): Promise<PresentationCreateSessionResponse> => {
  const response = await fetch('/session/create', { method: 'POST' })
  return readJson<PresentationCreateSessionResponse>(response)
}

export const fetchPresentationSessionInfo = async ({
  sid,
  clientId,
  role,
}: {
  sid: string
  clientId: string
  role: PresentationRole
}): Promise<PresentationSessionInfo> => {
  const searchParams = new URLSearchParams({ clientId, role })
  const response = await fetch(`/session/${sid}/info?${searchParams.toString()}`)
  return readJson<PresentationSessionInfo>(response)
}

export const postPresentationAsk = async (
  sid: string,
  request: PresentationAskRequest,
): Promise<PresentationSessionInfo> => {
  const response = await fetch(`/session/${sid}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJson<PresentationSessionInfo>(response)
}

export const postPresentationCommand = async (
  sid: string,
  request: PresentationCommandRequest,
): Promise<PresentationSessionInfo> => {
  const response = await fetch(`/session/${sid}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJson<PresentationSessionInfo>(response)
}

export const postPresentationRoute = async (
  sid: string,
  request: PresentationPresentRequest,
): Promise<PresentationSessionInfo> => {
  const response = await fetch(`/session/${sid}/present`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readJson<PresentationSessionInfo>(response)
}
