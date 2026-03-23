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
    return { operation: 'UTILITIES_STATUS', entity: 'dashboard', filters: { district: district ?? '', subsystem: subsystem ?? '' }, text }
  }
  if (/(аварийные отключения|плановые отключения|отключения по районам|отключения отопления|где больше всего отключений)/i.test(text)) {
    return { operation: /план/i.test(text) ? 'UTILITIES_PLANNED' : 'UTILITIES_STATUS', entity: 'incident', filters: { district: district ?? '', subsystem: subsystem ?? '', outageKind: /авар/i.test(text) ? 'emergency' : /план/i.test(text) ? 'planned' : '' }, text }
  }
  if (/(качество воздуха|aqi по районам|превышение пдк|история воздуха|погода|погод)/i.test(text)) {
    if (/риск/i.test(text)) return { operation: 'ECO_RISKS', entity: 'ecology', filters: { district: district ?? '' }, text }
    if (/истори|недел/i.test(text)) return { operation: 'ECO_HISTORY', entity: 'ecology', filters: { district: district ?? '' }, text }
    if (/пдк|превышен/i.test(text)) return { operation: 'ECO_PDK', entity: 'ecology', filters: { district: district ?? '' }, text }
    return { operation: 'ECO_STATUS', entity: 'ecology', filters: { district: district ?? '' }, text }
  }
  if (/(пробки сейчас|индекс дорожной нагрузки|нагрузка на дороги)/i.test(text)) {
    return { operation: 'TRAFFIC_INDEX', entity: 'transport', filters: { district: district ?? '' }, text }
  }
  if (/(как проехать|маршрут между районами|из .* в )/i.test(text) && /(район|центральн|советск|ленинск|октябрьск|академгород)/i.test(text)) {
    return { operation: 'TRANSIT_ROUTE', entity: 'transport', filters: { district: district ?? '' }, text }
  }
  if (/(остановки по районам|остановки)/i.test(text)) {
    return { operation: 'TRANSIT_DISTRICTS', entity: 'transport', filters: { district: district ?? '' }, text }
  }
  if (/(камеры видеофиксации|камеры в |точки контроля)/i.test(text)) {
    return { operation: 'CAMERAS_FILTER', entity: 'safety', filters: { district: district ?? '' }, text }
  }
  if (/(больницы в районе|поликлиники поблизости|медучреждения на карте)/i.test(text)) {
    return { operation: 'MEDICAL_FILTER', entity: 'medical', filters: { district: district ?? '' }, text }
  }
  if (/(активные стройки|стройки по районам|стройки в |ввод в эксплуатацию)/i.test(text)) {
    return { operation: /ввод/i.test(text) ? 'CONSTRUCTION_COMMISSIONED' : 'CONSTRUCTION_ACTIVE', entity: 'construction', filters: { district: district ?? '' }, text }
  }
  if (/(школы|детские сады|библиотеки|аптеки|спортивные организации|учреждения культуры|парковки)/i.test(text)) {
    return { operation: 'DIRECTORY_FILTER', entity: 'directory', filters: { district: district ?? '' }, text }
  }
  if (/(источники данных|source status|качество источников)/i.test(text)) {
    return { operation: 'SOURCE_STATUS', entity: 'sources', text }
  }

  if (/(стройки по районам|активные стройки|ввод в эксплуатацию|что по строительству)/i.test(text)) {
    return { operation: 'CONSTRUCTION_GROUP', entity: 'construction', filters: { district: district ?? '' }, text }
  }
  if (/(покажи live-источники|когда обновлялись данные|источники данных|live-источники)/i.test(text)) {
    return { operation: 'SOURCE_STATUS', entity: 'sources', text }
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
  if (entity === 'construction') return { operation: 'CONSTRUCTION_GROUP', entity, filters: { district: district ?? '' }, text }
  if (entity === 'ecology') return { operation: 'ECO_STATUS', entity, filters: { district: district ?? '' }, text }
  if (entity === 'transport') return { operation: 'TRAFFIC_INDEX', entity, filters: { district: district ?? '' }, text }
  if (entity === 'medical') return { operation: 'MEDICAL_FILTER', entity, filters: { district: district ?? '' }, text }
  if (entity === 'directory') return { operation: 'DIRECTORY_FILTER', entity, filters: { district: district ?? '' }, text }
  if (entity === 'safety') return { operation: 'CAMERAS_FILTER', entity, filters: { district: district ?? '' }, text }
  if (entity === 'sources') return { operation: 'SOURCE_STATUS', entity, text }
  if (entity === 'help') return { operation: isExplicitHelpRequest ? 'HELP' : 'UNKNOWN', entity, text }
  return { operation: 'UNKNOWN', entity, text }
}
