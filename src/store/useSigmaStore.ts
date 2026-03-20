import { create } from 'zustand'
import { briefs, dataSources, deputies, districts, incidents, kpis, notifications, regulations, scenarios, servicePerformance, subsystems } from '../mocks/data'
import type { ScenarioRun } from '../types'
import type { LiveBundle, LiveSourceMode, SigmaLiveState } from '../live/types'

const initialLiveState: SigmaLiveState = {
  mode: 'hybrid',
  isBootstrapping: false,
  sourceStatuses: [],
  liveIncidents: [],
  liveHistory: [],
  workflow: {},
}

export interface SigmaState {
  districts: typeof districts
  subsystems: typeof subsystems
  dataSources: typeof dataSources
  kpis: typeof kpis
  incidents: typeof incidents
  briefs: typeof briefs
  scenarios: typeof scenarios
  scenarioRuns: ScenarioRun[]
  deputies: typeof deputies
  regulations: typeof regulations
  notifications: typeof notifications
  servicePerformance: typeof servicePerformance
  selectedIncidentId?: string
  liveTick: number
  live: SigmaLiveState
  sourceMode: LiveSourceMode
  setSelectedIncident: (id: string) => void
  escalateIncident: (id: string) => void
  resolveIncident: (id: string) => void
  archiveIncident: (id: string) => void
  assignIncident: (id: string, assignee: string) => void
  takeLiveIncident: (id: string, owner: string) => void
  addLiveComment: (incidentId: string, text: string) => void
  toggleRecommendationStep: (incidentId: string, recId: string, stepId: string) => void
  addTimeline: (incidentId: string, text: string) => void
  approveIncident: (id: string) => void
  runScenario: (scenarioId: string) => void
  saveScenario: (runId: string) => void
  setDeputyMode: (id: string, mode: 'recommendation' | 'approval' | 'autonomous') => void
  createRegulation: (title: string, domain: string) => void
  bumpLive: () => void
  setLiveLoading: (loading: boolean) => void
  applyLiveBundle: (bundle: LiveBundle) => void
  setLiveError: (error: string) => void
}

const isLiveIncident = (id: string): boolean => id.startsWith('051-')

const addWorkflowEntry = (state: SigmaState, incidentId: string, action: 'assign' | 'escalate' | 'take' | 'comment', text: string, author: string) => ({
  ...state.live.workflow,
  [incidentId]: [
    ...(state.live.workflow[incidentId] ?? []),
    {
      id: crypto.randomUUID(),
      incidentId,
      action,
      text,
      author,
      at: new Date().toISOString(),
    },
  ],
})

export const useSigmaStore = create<SigmaState>((set, get) => ({
  districts,
  subsystems,
  dataSources,
  kpis,
  incidents,
  briefs,
  scenarios,
  scenarioRuns: [],
  deputies,
  regulations,
  notifications,
  servicePerformance,
  liveTick: 0,
  live: initialLiveState,
  sourceMode: 'hybrid',
  setSelectedIncident: (id) => set({ selectedIncidentId: id }),
  escalateIncident: (id) => set((state) => {
    if (isLiveIncident(id)) {
      return { live: { ...state.live, workflow: addWorkflowEntry(state, id, 'escalate', 'Live-инцидент эскалирован в локальный workflow.', 'Sigma') } }
    }
    return ({
      incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, severity: incident.severity === 'критический' ? 'критический' : 'высокий', status: 'эскалирован', timeline: [...incident.timeline, { id: crypto.randomUUID(), at: new Date().toISOString(), author: 'Sigma', text: 'Инцидент эскалирован' }] } : incident),
    })
  }),
  resolveIncident: (id) => set((state) => {
    if (isLiveIncident(id)) return state
    return ({ incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, status: 'решен', progress: 100, timeline: [...incident.timeline, { id: crypto.randomUUID(), at: new Date().toISOString(), author: 'Диспетчер', text: 'Инцидент закрыт' }] } : incident) })
  }),
  archiveIncident: (id) => set((state) => {
    if (isLiveIncident(id)) return state
    return ({ incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, status: 'архив' } : incident) })
  }),
  assignIncident: (id, assignee) => set((state) => {
    if (isLiveIncident(id)) {
      return { live: { ...state.live, workflow: addWorkflowEntry(state, id, 'assign', `Назначен: ${assignee}`, 'Оператор') } }
    }
    return ({ incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, assignee, timeline: [...incident.timeline, { id: crypto.randomUUID(), at: new Date().toISOString(), author: 'Оператор', text: `Назначен: ${assignee}` }] } : incident) })
  }),
  takeLiveIncident: (id, owner) => set((state) => ({ live: { ...state.live, workflow: addWorkflowEntry(state, id, 'take', `Взят в работу: ${owner}`, 'Штаб ЖКХ') } })),
  addLiveComment: (incidentId, text) => set((state) => ({ live: { ...state.live, workflow: addWorkflowEntry(state, incidentId, 'comment', text, 'Руководитель') } })),
  toggleRecommendationStep: (incidentId, recId, stepId) => set((state) => ({ incidents: state.incidents.map((incident) => incident.id !== incidentId ? incident : { ...incident, recommendations: incident.recommendations.map((recommendation) => recommendation.id !== recId ? recommendation : { ...recommendation, steps: recommendation.steps.map((step) => step.id === stepId ? { ...step, done: !step.done } : step) }) }) })),
  addTimeline: (incidentId, text) => set((state) => {
    if (isLiveIncident(incidentId)) {
      return { live: { ...state.live, workflow: addWorkflowEntry(state, incidentId, 'comment', text, 'Руководитель') } }
    }
    return ({ incidents: state.incidents.map((incident) => incident.id === incidentId ? { ...incident, timeline: [...incident.timeline, { id: crypto.randomUUID(), at: new Date().toISOString(), author: 'Руководитель', text }] } : incident) })
  }),
  approveIncident: (id) => set((state) => ({ incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, status: 'в работе', timeline: [...incident.timeline, { id: crypto.randomUUID(), at: new Date().toISOString(), author: 'Мэр', text: 'Действие одобрено' }] } : incident) })),
  runScenario: (scenarioId) => set((state) => ({ scenarioRuns: [...state.scenarioRuns, { id: crypto.randomUUID(), scenarioId, at: new Date().toISOString(), status: 'выполняется', projectedIncidents: 0, expectedDelay: 0, serviceLoad: 0 }] })),
  saveScenario: (runId) => {
    const run = get().scenarioRuns.find((item) => item.id === runId)
    if (run) localStorage.setItem(`sigma-run-${run.id}`, JSON.stringify(run))
  },
  setDeputyMode: (id, mode) => set((state) => ({ deputies: state.deputies.map((deputy) => deputy.id === id ? { ...deputy, mode } : deputy) })),
  createRegulation: (title, domain) => set((state) => ({ regulations: [{ id: crypto.randomUUID(), code: `РГ-${200 + state.regulations.length}`, title, domain, version: '1.0', status: 'активен', sourceDocument: 'Проект', sourceClause: 'п.1.1', effectiveFrom: new Date().toISOString(), parameters: ['время реакции'], recommendationTemplates: ['уведомление'], coverageStatus: 'частичное', linkedIncidentTypes: ['heat'] }, ...state.regulations] })),
  bumpLive: () => set((state) => ({
    liveTick: state.liveTick + 1,
    scenarioRuns: state.scenarioRuns.map((run, index) => run.status === 'готово' ? run : { ...run, status: index % 2 === 0 ? 'готово' : 'выполняется', projectedIncidents: 22 + index * 3, expectedDelay: 14 + index * 2, serviceLoad: 65 + index * 4 }),
    notifications: [{ id: crypto.randomUUID(), text: 'Новый alert: превышение порога по шуму', level: 'высокий' as const, createdAt: new Date().toISOString() }, ...state.notifications].slice(0, 15),
  })),
  setLiveLoading: (loading) => set((state) => ({ live: { ...state.live, isBootstrapping: loading } })),
  applyLiveBundle: (bundle) => set((state) => ({
    sourceMode: bundle.mode,
    live: {
      ...state.live,
      mode: bundle.mode,
      isBootstrapping: false,
      outages: bundle.outages,
      construction: bundle.construction,
      sourceStatuses: bundle.sourceStatuses,
      liveIncidents: bundle.outages.payload.incidents,
      liveHistory: bundle.outages.payload.history,
      lastError: undefined,
    },
  })),
  setLiveError: (error) => set((state) => ({ live: { ...state.live, isBootstrapping: false, lastError: error } })),
}))
