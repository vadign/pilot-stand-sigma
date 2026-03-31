import type { StateCreator } from 'zustand'
import type { LiveBundle } from '../../live/types'
import type { ScenarioRun } from '../../types'
import type { SigmaState } from '../useSigmaStore'
import { addWorkflowEntry, isLiveIncident } from './liveState'

type SigmaSet = Parameters<StateCreator<SigmaState>>[0]
type SigmaGet = Parameters<StateCreator<SigmaState>>[1]

const createScenarioRun = (scenarioId: string): ScenarioRun => ({
  id: crypto.randomUUID(),
  scenarioId,
  at: new Date().toISOString(),
  status: 'выполняется',
  projectedIncidents: 0,
  expectedDelay: 0,
  serviceLoad: 0,
})

const createRegulationDraft = (title: string, domain: string, count: number) => ({
  id: crypto.randomUUID(),
  code: `РГ-${200 + count}`,
  title,
  domain,
  version: '1.0',
  status: 'активен',
  sourceDocument: 'Проект',
  sourceClause: 'п.1.1',
  effectiveFrom: new Date().toISOString(),
  parameters: ['время реакции'],
  recommendationTemplates: ['уведомление'],
  coverageStatus: 'частичное' as const,
  linkedIncidentTypes: ['heat'],
})

const applyLiveBundleState = (state: SigmaState, bundle: LiveBundle): SigmaState['live'] => ({
  ...state.live,
  mode: bundle.mode,
  isBootstrapping: false,
  outages: bundle.outages,
  sourceStatuses: bundle.sourceStatuses,
  liveIncidents: bundle.outages.payload.incidents,
  liveHistory: bundle.outages.payload.history,
  lastError: undefined,
})

export const createSigmaActions = (set: SigmaSet, get: SigmaGet) => ({
  setSelectedIncident: (id: string) => set({ selectedIncidentId: id }),

  escalateIncident: (id: string) =>
    set((state) => {
      if (isLiveIncident(id)) {
        return {
          live: {
            ...state.live,
            workflow: addWorkflowEntry(
              state.live.workflow,
              id,
              'escalate',
              'Инцидент 051 эскалирован в локальный рабочий процесс.',
              'Сигма',
            ),
          },
        }
      }

      return {
        incidents: state.incidents.map((incident) =>
          incident.id === id
            ? {
                ...incident,
                severity: incident.severity === 'критический' ? 'критический' : 'высокий',
                status: 'эскалирован',
                timeline: [
                  ...incident.timeline,
                  {
                    id: crypto.randomUUID(),
                    at: new Date().toISOString(),
                    author: 'Сигма',
                    text: 'Инцидент эскалирован',
                  },
                ],
              }
            : incident,
        ),
      }
    }),

  resolveIncident: (id: string) =>
    set((state) => {
      if (isLiveIncident(id)) return state
      return {
        incidents: state.incidents.map((incident) =>
          incident.id === id
            ? {
                ...incident,
                status: 'решен',
                progress: 100,
                timeline: [
                  ...incident.timeline,
                  {
                    id: crypto.randomUUID(),
                    at: new Date().toISOString(),
                    author: 'Диспетчер',
                    text: 'Инцидент закрыт',
                  },
                ],
              }
            : incident,
        ),
      }
    }),

  archiveIncident: (id: string) =>
    set((state) => {
      if (isLiveIncident(id)) return state
      return {
        incidents: state.incidents.map((incident) =>
          incident.id === id ? { ...incident, status: 'архив' } : incident,
        ),
      }
    }),

  assignIncident: (id: string, assignee: string) =>
    set((state) => {
      if (isLiveIncident(id)) {
        return {
          live: {
            ...state.live,
            workflow: addWorkflowEntry(
              state.live.workflow,
              id,
              'assign',
              `Назначен: ${assignee}`,
              'Оператор',
            ),
          },
        }
      }

      return {
        incidents: state.incidents.map((incident) =>
          incident.id === id
            ? {
                ...incident,
                assignee,
                timeline: [
                  ...incident.timeline,
                  {
                    id: crypto.randomUUID(),
                    at: new Date().toISOString(),
                    author: 'Оператор',
                    text: `Назначен: ${assignee}`,
                  },
                ],
              }
            : incident,
        ),
      }
    }),

  takeLiveIncident: (id: string, owner: string) =>
    set((state) => ({
      live: {
        ...state.live,
        workflow: addWorkflowEntry(
          state.live.workflow,
          id,
          'take',
          `Взят в работу: ${owner}`,
          'Штаб ЖКХ',
        ),
      },
    })),

  addLiveComment: (incidentId: string, text: string) =>
    set((state) => ({
      live: {
        ...state.live,
        workflow: addWorkflowEntry(state.live.workflow, incidentId, 'comment', text, 'Руководитель'),
      },
    })),

  toggleRecommendationStep: (incidentId: string, recId: string, stepId: string) =>
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id !== incidentId
          ? incident
          : {
              ...incident,
              recommendations: incident.recommendations.map((recommendation) =>
                recommendation.id !== recId
                  ? recommendation
                  : {
                      ...recommendation,
                      steps: recommendation.steps.map((step) =>
                        step.id === stepId ? { ...step, done: !step.done } : step,
                      ),
                    },
              ),
            },
      ),
    })),

  addTimeline: (incidentId: string, text: string) =>
    set((state) => {
      if (isLiveIncident(incidentId)) {
        return {
          live: {
            ...state.live,
            workflow: addWorkflowEntry(
              state.live.workflow,
              incidentId,
              'comment',
              text,
              'Руководитель',
            ),
          },
        }
      }

      return {
        incidents: state.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                timeline: [
                  ...incident.timeline,
                  {
                    id: crypto.randomUUID(),
                    at: new Date().toISOString(),
                    author: 'Руководитель',
                    text,
                  },
                ],
              }
            : incident,
        ),
      }
    }),

  approveIncident: (id: string) =>
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              status: 'в работе',
              timeline: [
                ...incident.timeline,
                {
                  id: crypto.randomUUID(),
                  at: new Date().toISOString(),
                  author: 'Мэр',
                  text: 'Действие одобрено',
                },
              ],
            }
          : incident,
      ),
    })),

  runScenario: (scenarioId: string) =>
    set((state) => ({
      scenarioRuns: [...state.scenarioRuns, createScenarioRun(scenarioId)],
    })),

  saveScenario: (runId: string) => {
    const run = get().scenarioRuns.find((item) => item.id === runId)
    if (run) localStorage.setItem(`sigma-run-${run.id}`, JSON.stringify(run))
  },

  setDeputyMode: (id: string, mode: 'recommendation' | 'approval' | 'autonomous') =>
    set((state) => ({
      deputies: state.deputies.map((deputy) =>
        deputy.id === id ? { ...deputy, mode } : deputy,
      ),
    })),

  createRegulation: (title: string, domain: string) =>
    set((state) => ({
      regulations: [
        createRegulationDraft(title, domain, state.regulations.length),
        ...state.regulations,
      ],
    })),

  bumpLive: () =>
    set((state) => ({
      liveTick: state.liveTick + 1,
      scenarioRuns: state.scenarioRuns.map((run, index) =>
        run.status === 'готово'
          ? run
          : {
              ...run,
              status: index % 2 === 0 ? 'готово' : 'выполняется',
              projectedIncidents: 22 + index * 3,
              expectedDelay: 14 + index * 2,
              serviceLoad: 65 + index * 4,
            },
      ),
      notifications: [
        {
          id: crypto.randomUUID(),
          text: 'Новый alert: превышение порога по шуму',
          level: 'высокий' as const,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 15),
    })),

  setLiveLoading: (loading: boolean) =>
    set((state) => ({
      live: { ...state.live, isBootstrapping: loading },
    })),

  applyLiveBundle: (bundle: LiveBundle) =>
    set((state) => ({
      sourceMode: bundle.mode,
      live: applyLiveBundleState(state, bundle),
    })),

  setLiveError: (error: string) =>
    set((state) => ({
      live: { ...state.live, isBootstrapping: false, lastError: error },
    })),
})
