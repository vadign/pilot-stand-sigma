import { findDistrictId } from '../../lib/districts'
import { detectSpecialIntent } from './specialQueries'
import type { AskSigmaPlan, AskSigmaQuery } from './types'
import { routeEntity } from './router'
import { detectRouteFromText, detectTransportDistrictFilters, detectTransportMode } from './transportQuery'

export const createPlan = (query: AskSigmaQuery): AskSigmaPlan => {
  const special = detectSpecialIntent(query.raw)
  if (special?.type === 'role_switch') return { operation: 'HELP', text: query.raw, role: special.role, district: special.district }
  if (special?.type === 'navigate') return { operation: 'NAVIGATE', route: special.route, text: query.raw }

  const { entity, subsystem } = routeEntity(query)
  const text = query.normalized
  const district = findDistrictId(text)
  const transportDistricts = detectTransportDistrictFilters(text)
  const fromTransportDistrict = transportDistricts[0]
  const toTransportDistrict = transportDistricts[1]
  const route = detectRouteFromText(text)
  const mode = detectTransportMode(text)
  const criticalOnly = /критичн|критическ/i.test(text)
  const isExplicitHelpRequest = /помощ|подскажи|что (?:ты )?уме(?:е|)шь|что умеет сигма/i.test(text)

  if (/(отключения сейчас|что сейчас в жкх|что происходит сейчас|что сейчас|обстановка сейчас)/i.test(text)) {
    return { operation: 'SUMMARY', entity: 'dashboard', filters: { district: district ?? '', subsystem: subsystem ?? '' }, text }
  }
  if (/(аварийные отключения|плановые отключения|экстренные отключения|запланированные отключения|отключения по районам|отключения отопления|отключения энергетики|отключения электричества|отключения электроснабжения|где больше всего отключений)/i.test(text)) {
    return {
      operation: 'FILTER',
      entity: 'incident',
      filters: {
        district: district ?? '',
        subsystem: subsystem ?? '',
        outageKind: /авар|экстр/i.test(text) ? 'emergency' : /план|заплан/i.test(text) ? 'planned' : '',
        severity: criticalOnly ? 'критический' : '',
      },
      text,
    }
  }

  if (/(покажи транспорт на карте|покажи общественный транспорт на карте|на карте)/i.test(text) && /(транспорт|остановк|маршрут|проезд|как добраться|как проехать)/i.test(text)) {
    return {
      operation: 'TRANSIT_NAVIGATE_TO_PAGE',
      entity: 'transport',
      text,
      filters: {
        district: fromTransportDistrict?.districtId ?? fromTransportDistrict?.district ?? '',
        fromDistrict: fromTransportDistrict?.district ?? '',
        toDistrict: toTransportDistrict?.district ?? '',
        route: route ?? '',
        mode: mode ?? '',
        pavilionOnly: /павильон/i.test(text),
        focus: 'map',
      },
    }
  }

  if (/(как проехать|как добраться|общих маршрутов между|между .* и .* маршру)/i.test(text)) {
    return {
      operation: 'TRANSIT_ROUTE_BETWEEN_DISTRICTS',
      entity: 'transport',
      text,
      filters: {
        fromDistrict: fromTransportDistrict?.district ?? '',
        toDistrict: toTransportDistrict?.district ?? '',
      },
    }
  }

  if (/(какие районы лучше всего покрыты транспортом|сравни .*район|лучше покрыты|по районам)/i.test(text) && /транспорт|район/i.test(text)) {
    return { operation: 'TRANSIT_DISTRICT_COMPARE', entity: 'transport', text }
  }

  if (/(общественный транспорт|покажи общественный транспорт|покажи транспорт)/i.test(text)) {
    return { operation: 'PUBLIC_TRANSPORT_SUMMARY', entity: 'transport', text }
  }
  if (/(какой тариф на автобус|тариф на автобус|тарифы на проезд|тариф на транспорт|социальный тариф|покажи тарифы)/i.test(text)) {
    return { operation: 'TRANSIT_FARES', entity: 'transport', text, filters: { mode: mode ?? '' } }
  }
  if (/(топ транспортных узлов|остановки с наибольшим числом маршрутов|пересадк|узел)/i.test(text)) {
    return { operation: 'TRANSIT_HUBS', entity: 'transport', text }
  }
  if (/(какие остановки у маршрута|маршрут\s*\d+|какие маршруты есть в|маршруты в)/i.test(text)) {
    return { operation: 'TRANSIT_ROUTE_LOOKUP', entity: 'transport', text, filters: { route: route ?? '', district: fromTransportDistrict?.district ?? '' } }
  }
  if (/(остановки в|остановки с павильоном|сколько остановок в|остановки)/i.test(text)) {
    return {
      operation: 'TRANSIT_STOPS',
      entity: 'transport',
      text,
      filters: {
        district: fromTransportDistrict?.districtId ?? fromTransportDistrict?.district ?? '',
        districtLabel: fromTransportDistrict?.district ?? '',
        rawDistrict: fromTransportDistrict?.rawLabel ?? '',
        pavilionOnly: /павильон/i.test(text),
        metric: /сколько/i.test(text) ? 'count' : '',
      },
    }
  }

  if (/(покажи источники|статус источников|когда обновлялись данные|источники данных)/i.test(text)) {
    return { operation: 'LIVE_SOURCES', entity: 'sources', text }
  }
  if (/сводка.*24|24 часа|отчет/i.test(text)) return { operation: 'BRIEFING', entity: 'briefing', text }
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

  if (entity === 'incident') {
    return {
      operation: 'FILTER',
      entity,
      filters: {
        subsystem: subsystem ?? '',
        district: district ?? '',
        severity: criticalOnly ? 'критический' : '',
      },
      text,
    }
  }
  if (entity === 'transport') return { operation: 'PUBLIC_TRANSPORT_SUMMARY', entity, text }
  if (entity === 'sources') return { operation: 'LIVE_SOURCES', entity, text }
  if (entity === 'help') return { operation: isExplicitHelpRequest ? 'HELP' : 'UNKNOWN', entity, text }
  return { operation: 'UNKNOWN', entity, text }
}
