import { getDistrictAnswerName } from '../../lib/districts'
import type { AskSigmaContext, AskSigmaExplain, AskSigmaPlan } from './types'

export const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined => String(plan.filters?.district ?? '').trim() || undefined

export const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean => !district || incidentDistrict === district

export const formatIncidentDistrictLabel = (district?: string): string => district ? `по району «${getDistrictAnswerName(district)}»` : ''

export const matchesIncidentSubsystem = (incidentSubsystem: string, subsystem: string | undefined): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') return incidentSubsystem === 'heat' || incidentSubsystem === 'utilities'
  return incidentSubsystem.includes(subsystem.slice(0, 4))
}

export const matchesRegulationSubsystem = (linkedIncidentTypes: string[], subsystem: string | undefined): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') return linkedIncidentTypes.some((type) => type === 'heat' || type === 'utilities')
  return linkedIncidentTypes.some((type) => type.includes(subsystem.slice(0, 4)))
}

export const buildExplainBase = (context: AskSigmaContext): AskSigmaExplain => {
  const primaryStatus = context.sourceStatuses?.[0]
  return {
    source: primaryStatus?.title ?? 'Хранилище Сигмы',
    updatedAt: primaryStatus?.updatedAt ?? context.now,
    dataType: primaryStatus?.type ?? 'calculated',
  }
}
