import type { SigmaLiveState } from '../../live/types'

export const createInitialLiveState = (): SigmaLiveState => ({
  mode: 'hybrid',
  isBootstrapping: false,
  sourceStatuses: [],
  liveIncidents: [],
  liveHistory: [],
  workflow: {},
})

export const isLiveIncident = (id: string): boolean => id.startsWith('051-')

export const addWorkflowEntry = (
  workflow: SigmaLiveState['workflow'],
  incidentId: string,
  action: 'assign' | 'escalate' | 'take' | 'comment',
  text: string,
  author: string,
): SigmaLiveState['workflow'] => ({
  ...workflow,
  [incidentId]: [
    ...(workflow[incidentId] ?? []),
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
