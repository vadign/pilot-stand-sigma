import type { SigmaLiveState } from '../../live/types'
import { createRandomId } from '../../lib/randomId'

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
      id: createRandomId(),
      incidentId,
      action,
      text,
      author,
      at: new Date().toISOString(),
    },
  ],
})
