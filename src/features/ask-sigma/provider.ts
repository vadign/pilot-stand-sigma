import { selectConstructionAggregates, selectIncidentViewList, selectIndicators, selectOutageSummary, selectReferenceObjects, selectRiskCards, selectSourceStatuses, selectTrafficIndex, selectTransitRoutes } from '../../live/selectors'
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
      incidents: selectIncidentViewList(state),
      regulations: state.regulations,
      scenarios: state.scenarios,
      deputies: state.deputies,
      servicePerformance: state.servicePerformance,
      notifications: state.notifications,
      liveSummary: selectOutageSummary(state),
      constructionAggregates: selectConstructionAggregates(state),
      sourceStatuses: selectSourceStatuses(state),
      indicators: selectIndicators(state),
      referenceObjects: selectReferenceObjects(state),
      riskCards: selectRiskCards(state),
      trafficIndex: selectTrafficIndex(state),
      transitRoutes: selectTransitRoutes(state),
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
