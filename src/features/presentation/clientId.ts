import type { PresentationRole } from './types'
import { createRandomId } from '../../lib/randomId'

const clientIdKeys: Record<PresentationRole, string> = {
  mobile: 'sigma.presentation.mobileClientId',
  display: 'sigma.presentation.displayClientId',
  viewer: 'sigma.presentation.viewerClientId',
}

export const getPresentationClientId = (role: PresentationRole): string => {
  const storageKey = clientIdKeys[role]
  const existing = window.localStorage.getItem(storageKey)
  if (existing) return existing

  const clientId = createRandomId()
  window.localStorage.setItem(storageKey, clientId)
  return clientId
}
