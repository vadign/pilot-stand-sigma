import { findDistrictId } from '../../lib/districts'
import { detectSpecialIntent } from './specialQueries'
import type { AskSigmaPlan, AskSigmaQuery } from './types'
import { routeEntity } from './router'
import { ASK_SIGMA_MATCHERS, matchesTransitMapIntent } from './planMatchers'
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
  const criticalOnly = ASK_SIGMA_MATCHERS.critical.test(text)
  const isExplicitHelpRequest = ASK_SIGMA_MATCHERS.helpIntent.test(text)

  if (ASK_SIGMA_MATCHERS.summary.test(text)) {
    return { operation: 'SUMMARY', entity: 'dashboard', filters: { district: district ?? '', subsystem: subsystem ?? '' }, text }
  }
  if (ASK_SIGMA_MATCHERS.outages.test(text)) {
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

  if (matchesTransitMapIntent(text)) {
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
        pavilionOnly: ASK_SIGMA_MATCHERS.pavilionOnly.test(text),
        focus: 'map',
      },
    }
  }

  if (ASK_SIGMA_MATCHERS.routeBetweenDistricts.test(text)) {
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

  if (ASK_SIGMA_MATCHERS.districtCompare.test(text) && /транспорт|район/i.test(text)) {
    return { operation: 'TRANSIT_DISTRICT_COMPARE', entity: 'transport', text }
  }

  if (ASK_SIGMA_MATCHERS.transportSummary.test(text)) {
    return { operation: 'PUBLIC_TRANSPORT_SUMMARY', entity: 'transport', text }
  }
  if (ASK_SIGMA_MATCHERS.fares.test(text)) {
    return { operation: 'TRANSIT_FARES', entity: 'transport', text, filters: { mode: mode ?? '' } }
  }
  if (ASK_SIGMA_MATCHERS.hubs.test(text)) {
    return { operation: 'TRANSIT_HUBS', entity: 'transport', text }
  }
  if (ASK_SIGMA_MATCHERS.routeLookup.test(text)) {
    return { operation: 'TRANSIT_ROUTE_LOOKUP', entity: 'transport', text, filters: { route: route ?? '', district: fromTransportDistrict?.district ?? '' } }
  }
  if (ASK_SIGMA_MATCHERS.stops.test(text)) {
    return {
      operation: 'TRANSIT_STOPS',
      entity: 'transport',
      text,
      filters: {
        district: fromTransportDistrict?.districtId ?? fromTransportDistrict?.district ?? '',
        districtLabel: fromTransportDistrict?.district ?? '',
        rawDistrict: fromTransportDistrict?.rawLabel ?? '',
        pavilionOnly: ASK_SIGMA_MATCHERS.pavilionOnly.test(text),
        metric: /сколько/i.test(text) ? 'count' : '',
      },
    }
  }

  if (ASK_SIGMA_MATCHERS.liveSources.test(text)) {
    return { operation: 'LIVE_SOURCES', entity: 'sources', text }
  }
  if (ASK_SIGMA_MATCHERS.briefing.test(text)) return { operation: 'BRIEFING', entity: 'briefing', text }
  if (ASK_SIGMA_MATCHERS.incidentOpen.test(text) || ASK_SIGMA_MATCHERS.incidentById.test(text)) {
    const rawId = query.raw.match(/(051-|inc-|sig-)\S+/i)?.[0]
    const incidentId = rawId?.toUpperCase().replace('SIG-', 'INC-')
    return { operation: 'INCIDENT_DETAIL', entity: 'incident', incidentId, text }
  }
  if (ASK_SIGMA_MATCHERS.regulationGuidance.test(text)) return { operation: 'REGULATION_GUIDANCE', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  if (ASK_SIGMA_MATCHERS.regulationLookup.test(text)) return { operation: 'REGULATION_LOOKUP', entity: 'regulation', filters: { subsystem: subsystem ?? '' }, text }
  if (ASK_SIGMA_MATCHERS.history.test(text)) return { operation: 'HISTORY_TREND', entity: 'history', filters: { subsystem: subsystem ?? '' }, text }
  if (ASK_SIGMA_MATCHERS.scenarioCompare.test(text)) return { operation: 'SCENARIO_COMPARE', entity: 'scenario', text }
  if (ASK_SIGMA_MATCHERS.scenarioLookup.test(text)) return { operation: 'SCENARIO_LOOKUP', entity: 'scenario', text }
  if (ASK_SIGMA_MATCHERS.deputyMode.test(text)) return { operation: 'DEPUTY_MODE_CHANGE', entity: 'deputy', filters: { mode: 'approval', subsystem: subsystem ?? '' }, text }
  if (ASK_SIGMA_MATCHERS.deputyStatus.test(text)) return { operation: 'DEPUTY_STATUS', entity: 'deputy', filters: { subsystem: subsystem ?? '' }, text }
  if (ASK_SIGMA_MATCHERS.approvals.test(text)) return { operation: 'APPROVALS', entity: 'approval', filters: { district: district ?? '' }, text }

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
