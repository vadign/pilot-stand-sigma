import type { LiveIncidentView } from '../../live/types'
import { buildDemoIncidentReplayScenario } from './demoScenario'
import type { IncidentReplayScenario } from './types'

export const loadIncidentReplayScenario = async (
  incident: LiveIncidentView,
): Promise<IncidentReplayScenario> => Promise.resolve(buildDemoIncidentReplayScenario(incident))
