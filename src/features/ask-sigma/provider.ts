import { useSigmaStore } from '../../store/useSigmaStore'
import type { AskSigmaContext } from './types'

export interface AskSigmaProvider {
  getContext(): AskSigmaContext
  setDeputyMode?(deputyId: string, mode: 'recommendation' | 'approval' | 'autonomous'): void
}

export class LocalAskSigmaProvider implements AskSigmaProvider {
  getContext(): AskSigmaContext {
    const state = useSigmaStore.getState()
    return {
      role: 'мэр',
      incidents: state.incidents,
      regulations: state.regulations,
      scenarios: state.scenarios,
      deputies: state.deputies,
      servicePerformance: state.servicePerformance,
      notifications: state.notifications,
      now: new Date().toISOString(),
    }
  }

  setDeputyMode(deputyId: string, mode: 'recommendation' | 'approval' | 'autonomous') {
    useSigmaStore.getState().setDeputyMode(deputyId, mode)
  }
}

export class RemoteAskSigmaProvider implements AskSigmaProvider {
  getContext(): AskSigmaContext {
    throw new Error('RemoteAskSigmaProvider is a placeholder for future backend integration')
  }
}
