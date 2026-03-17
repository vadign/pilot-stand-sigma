import { findDistrictId } from '../../lib/districts'
import { detectSpecialIntent } from './specialQueries'
import type { AskSigmaPlan, AskSigmaQuery } from './types'
import { routeEntity } from './router'

export const createPlan = (query: AskSigmaQuery): AskSigmaPlan => {
  const special = detectSpecialIntent(query.raw)
  if (special?.type === 'role_switch') {
    return { operation: 'HELP', text: query.raw, role: special.role, district: special.district }
  }

  if (special?.type === 'navigate') {
    return { operation: 'NAVIGATE', route: special.route, text: query.raw }
  }

  const { entity, subsystem } = routeEntity(query)
  const text = query.normalized
  const isExplicitHelpRequest = /помощ|подскажи|что (?:ты )?уме(?:е|)шь|что умеет сигма/i.test(text)
  const district = findDistrictId(text)

  if (/(что происходит сейчас|что сейчас|обстановка сейчас)/i.test(text)) {
    return { operation: 'SUMMARY', entity: 'dashboard', filters: { district: district ?? '' }, text }
  }

  if (/сводка.*24|24 часа|бриф/i.test(text)) {
    return { operation: 'BRIEFING', entity: 'briefing', text }
  }

  if (/открой инцидент/i.test(text) || /sig-|inc-/i.test(text)) {
    const incidentId = query.raw.match(/(sig-|inc-)\d+/i)?.[0]?.toUpperCase().replace('SIG-', 'INC-')
    return { operation: 'INCIDENT_DETAIL', entity: 'incident', incidentId, text }
  }

  if (/что делать|прорыв|предписан/i.test(text)) {
    return { operation: 'REGULATION_GUIDANCE', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  }

  if (/какой регламент/i.test(text)) {
    return { operation: 'REGULATION_LOOKUP', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  }

  if (/динамик|за неделю|за месяц|тренд|истори|аналит/i.test(text)) {
    return { operation: 'HISTORY_TREND', entity: 'history', filters: { subsystem: subsystem ?? '' }, text }
  }

  if (/сравни|без вмешательства|с вмешательством/i.test(text)) {
    return { operation: 'SCENARIO_COMPARE', entity: 'scenario', text }
  }

  if (/сценар/i.test(text)) {
    return { operation: 'SCENARIO_LOOKUP', entity: 'scenario', text }
  }

  if (/переведи заместителя|режим подтверждения/i.test(text)) {
    return { operation: 'DEPUTY_MODE_CHANGE', entity: 'deputy', filters: { mode: 'approval', subsystem: subsystem ?? '' }, text }
  }

  if (/заместител/i.test(text)) {
    return { operation: 'DEPUTY_STATUS', entity: 'deputy', filters: { subsystem: subsystem ?? '' }, text }
  }

  if (/согласован|требует согласования|требует решения/i.test(text)) {
    return { operation: 'APPROVALS', entity: 'approval', filters: { district: district ?? '' }, text }
  }

  if (entity === 'incident') {
    const severity = /критич/i.test(text) ? 'критический' : undefined
    return { operation: 'FILTER', entity, filters: { subsystem: subsystem ?? '', severity: severity ?? '', district: district ?? '' }, text }
  }

  if (entity === 'help') {
    return { operation: isExplicitHelpRequest ? 'HELP' : 'UNKNOWN', entity, text }
  }

  return { operation: 'UNKNOWN', entity, text }
}
