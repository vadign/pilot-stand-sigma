import { getDistrictAnswerName } from '../../../lib/districts'
import { defaultTransportFares, defaultTransportStops } from '../../public-transport/data/defaultTransportData'
import { getTransportDistrictLabel } from '../../public-transport/selectors'
import type { AskSigmaPlan } from '../types'
import type { AskSigmaProvider } from '../provider'

export const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined =>
  String(plan.filters?.district ?? '').trim() || undefined

export const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean =>
  !district || incidentDistrict === district

export const formatDistrictLabel = (district?: string): string =>
  district ? `по району «${getDistrictAnswerName(district)}»` : ''

export const matchesSubsystem = (incidentSubsystem: string, subsystem: string | undefined): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') return incidentSubsystem === 'heat' || incidentSubsystem === 'utilities'
  return incidentSubsystem.includes(subsystem.slice(0, 4))
}

export const matchesRegulationSubsystem = (
  linkedIncidentTypes: string[],
  subsystem: string | undefined,
): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') {
    return linkedIncidentTypes.some((type) => type === 'heat' || type === 'utilities')
  }
  return linkedIncidentTypes.some((type) => type.includes(subsystem.slice(0, 4)))
}

export const getTransportData = (provider: AskSigmaProvider) => {
  const context = provider.getContext()
  const fallbackMode = !context.publicTransport?.stops?.length
  return {
    context,
    stops: context.publicTransport?.stops ?? defaultTransportStops,
    fares: context.publicTransport?.fares ?? defaultTransportFares,
    statuses: context.publicTransport?.statuses ?? [],
    fallbackMode,
  }
}

export const toTransportDistrictTitle = (district: string): string =>
  `${getTransportDistrictLabel(district)} район`
