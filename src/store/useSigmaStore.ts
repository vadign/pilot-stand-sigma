import { create } from 'zustand'
import type { LiveBundle, LiveSourceMode, SigmaLiveState } from '../live/types'
import type { ScenarioRun } from '../types'
import { createSigmaActions } from './internal/createSigmaActions'
import { createInitialLiveState } from './internal/liveState'
import { seedSigmaData } from './internal/seedData'

export interface SigmaState {
  districts: typeof seedSigmaData.districts
  subsystems: typeof seedSigmaData.subsystems
  dataSources: typeof seedSigmaData.dataSources
  kpis: typeof seedSigmaData.kpis
  incidents: typeof seedSigmaData.incidents
  briefs: typeof seedSigmaData.briefs
  scenarios: typeof seedSigmaData.scenarios
  scenarioRuns: ScenarioRun[]
  deputies: typeof seedSigmaData.deputies
  regulations: typeof seedSigmaData.regulations
  notifications: typeof seedSigmaData.notifications
  servicePerformance: typeof seedSigmaData.servicePerformance
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

export const createSigmaState = (
  set: Parameters<typeof createSigmaActions>[0],
  get: Parameters<typeof createSigmaActions>[1],
): SigmaState => ({
  ...seedSigmaData,
  scenarioRuns: [],
  liveTick: 0,
  live: createInitialLiveState(),
  sourceMode: 'hybrid',
  ...createSigmaActions(set, get),
})

export const useSigmaStore = create<SigmaState>((set, get) => createSigmaState(set, get))
