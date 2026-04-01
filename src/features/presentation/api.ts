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

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json() as T | { error?: string }
  if (!response.ok) {
    if (response.status === 409 && typeof payload === 'object' && payload && 'error' in payload) {
      throw new PresentationControllerConflictError(payload as PresentationControllerConflict)
    }
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String(payload.error)
      : response.statusText
    throw new Error(message)
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
