import type { PresentationRole } from './types'
import { createRandomId } from '../../lib/randomId'

const clientIdKeys: Record<PresentationRole, string> = {
  mobile: 'sigma.presentation.mobileClientId',
  display: 'sigma.presentation.displayClientId',
  viewer: 'sigma.presentation.viewerClientId',
}

const volatileClientIds: Partial<Record<PresentationRole, string>> = {}

const readStoredClientId = (storageKey: string): string | undefined => {
  try {
    return window.localStorage.getItem(storageKey) ?? undefined
  } catch {
    return undefined
  }
}

const writeStoredClientId = (storageKey: string, clientId: string) => {
  try {
    window.localStorage.setItem(storageKey, clientId)
  } catch {
    return undefined
  }
}

export const getPresentationClientId = (role: PresentationRole): string => {
  const storageKey = clientIdKeys[role]
  const existing = readStoredClientId(storageKey) ?? volatileClientIds[role]
  if (existing) return existing

  const clientId = createRandomId()
  volatileClientIds[role] = clientId
  writeStoredClientId(storageKey, clientId)
  return clientId
}
