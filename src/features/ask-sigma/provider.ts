import { selectIncidentViewList, selectOutageSummary, selectSourceStatuses } from '../../live/selectors'
import { defaultTransportFares, defaultTransportStops } from '../public-transport/data/defaultTransportData'
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
      sourceStatuses: selectSourceStatuses(state),
      publicTransport: {
        stops: defaultTransportStops,
        fares: defaultTransportFares,
        statuses: [
          { key: 'transport-stops', datasetId: '49', title: 'Остановки наземного транспорта', sourceUrl: 'https://opendata.novo-sibirsk.ru/pass.aspx?ID=49', source: 'mock', dataType: 'mock-fallback', status: 'stale', updatedAt: defaultTransportStops[0]?.updatedAt, fetchedAt: new Date().toISOString(), ttlHours: 24, message: 'Локальный резервный набор данных 49' },
          { key: 'transport-fares', datasetId: '51', title: 'Тарифы на проезд', sourceUrl: 'https://opendata.novo-sibirsk.ru/pass.aspx?ID=51', source: 'mock', dataType: 'mock-fallback', status: 'stale', updatedAt: defaultTransportFares[0]?.updatedAt, fetchedAt: new Date().toISOString(), ttlHours: 24, message: 'Локальный резервный набор данных 51' },
        ],
      },
      now: new Date().toISOString(),
    }
  }

  setDeputyMode(deputyId: string, mode: 'recommendation' | 'approval' | 'autonomous') {
    useSigmaStore.getState().setDeputyMode(deputyId, mode)
  }
}

export class RemoteAskSigmaProvider implements AskSigmaProvider {
  getContext(): AskSigmaContext {
    throw new Error('RemoteAskSigmaProvider пока не подключен к серверной интеграции')
  }
}
