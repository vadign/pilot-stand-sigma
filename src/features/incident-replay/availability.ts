import type { LiveIncidentView } from '../../live/types'
import type { Incident } from '../../types'

type ReplayEligibleIncident = Pick<Incident, 'id' | 'severity' | 'subsystem'> & {
  liveMeta?: Pick<NonNullable<LiveIncidentView['liveMeta']>, 'outageKind' | 'utilityType'>
}

export const incidentReplayCtaLabel = 'Открыть воспроизведение и прогноз'

export const buildIncidentReplayRoute = (incidentId: string): string =>
  `/incidents/${incidentId}/replay`

const replayUtilityTypes = new Set(['heating', 'hot_water'])

export const isHeatReplayIncident = (incident: ReplayEligibleIncident): boolean =>
  incident.subsystem === 'heat' ||
  replayUtilityTypes.has(String(incident.liveMeta?.utilityType ?? ''))

export const canOpenIncidentReplay = (incident: ReplayEligibleIncident): boolean =>
  isHeatReplayIncident(incident) && (
    incident.severity === 'критический' ||
    incident.liveMeta?.outageKind === 'emergency'
  )
