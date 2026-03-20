import { findDistrictId } from '../../lib/districts'
import { detectSpecialIntent } from './specialQueries'
import type { AskSigmaPlan, AskSigmaQuery } from './types'
import { routeEntity } from './router'

export const createPlan = (query: AskSigmaQuery): AskSigmaPlan => {
  const special = detectSpecialIntent(query.raw)
  if (special?.type === 'role_switch') return { operation: 'HELP', text: query.raw, role: special.role, district: special.district }
  if (special?.type === 'navigate') return { operation: 'NAVIGATE', route: special.route, text: query.raw }

  const { entity, subsystem } = routeEntity(query)
  const text = query.normalized
  const district = findDistrictId(text)
  const isExplicitHelpRequest = /помощ|подскажи|что (?:ты )?уме(?:е|)шь|что умеет сигма/i.test(text)

  if (/(отключения сейчас|что сейчас в жкх|что происходит сейчас|что сейчас|обстановка сейчас)/i.test(text)) {
    return { operation: 'SUMMARY', entity: 'dashboard', filters: { district: district ?? '', subsystem: subsystem ?? '' }, text }
  }
  if (/(аварийные отключения|плановые отключения|отключения по районам|отключения отопления|где больше всего отключений)/i.test(text)) {
    return { operation: 'FILTER', entity: 'incident', filters: { district: district ?? '', subsystem: subsystem ?? '', outageKind: /авар/i.test(text) ? 'emergency' : /план/i.test(text) ? 'planned' : '' }, text }
  }
  if (/(стройки по районам|активные стройки|ввод в эксплуатацию|что по строительству)/i.test(text)) {
    return { operation: 'CONSTRUCTION', entity: 'construction', filters: { district: district ?? '' }, text }
  }
  if (/(покажи live-источники|когда обновлялись данные|источники данных|live-источники)/i.test(text)) {
    return { operation: 'LIVE_SOURCES', entity: 'sources', text }
  }
  if (/сводка.*24|24 часа|бриф/i.test(text)) return { operation: 'BRIEFING', entity: 'briefing', text }
  if (/открой инцидент/i.test(text) || /051-|inc-|sig-/i.test(text)) {
    const rawId = query.raw.match(/(051-|inc-|sig-)\S+/i)?.[0]
    const incidentId = rawId?.toUpperCase().replace('SIG-', 'INC-')
    return { operation: 'INCIDENT_DETAIL', entity: 'incident', incidentId, text }
  }
  if (/что делать|прорыв|предписан/i.test(text)) return { operation: 'REGULATION_GUIDANCE', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  if (/какой регламент/i.test(text)) return { operation: 'REGULATION_LOOKUP', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  if (/динамик|за неделю|за месяц|тренд|истори|аналит/i.test(text)) return { operation: 'HISTORY_TREND', entity: 'history', filters: { subsystem: subsystem ?? '' }, text }
  if (/сравни|без вмешательства|с вмешательством/i.test(text)) return { operation: 'SCENARIO_COMPARE', entity: 'scenario', text }
  if (/сценар/i.test(text)) return { operation: 'SCENARIO_LOOKUP', entity: 'scenario', text }
  if (/переведи заместителя|режим подтверждения/i.test(text)) return { operation: 'DEPUTY_MODE_CHANGE', entity: 'deputy', filters: { mode: 'approval', subsystem: subsystem ?? '' }, text }
  if (/заместител/i.test(text)) return { operation: 'DEPUTY_STATUS', entity: 'deputy', filters: { subsystem: subsystem ?? '' }, text }
  if (/согласован|требует согласования|требует решения/i.test(text)) return { operation: 'APPROVALS', entity: 'approval', filters: { district: district ?? '' }, text }

  if (entity === 'incident') return { operation: 'FILTER', entity, filters: { subsystem: subsystem ?? '', district: district ?? '' }, text }
  if (entity === 'construction') return { operation: 'CONSTRUCTION', entity, filters: { district: district ?? '' }, text }
  if (entity === 'sources') return { operation: 'LIVE_SOURCES', entity, text }
  if (entity === 'help') return { operation: isExplicitHelpRequest ? 'HELP' : 'UNKNOWN', entity, text }
  return { operation: 'UNKNOWN', entity, text }
}
