import { getDistrictAnswerName } from '../../lib/districts'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { defaultTransportFares, defaultTransportStops } from '../public-transport/data/defaultTransportData'
import { getTransportDistrictLabel, selectCurrentFareCards, selectDistrictConnectivity, selectFilteredStops, selectGlobalTransportMetrics, selectRouteDetails, selectSelectedDistrictSummary, selectStopsForRoute } from '../public-transport/selectors'
import type { AskSigmaPlan, AskSigmaResult, SigmaRole } from './types'
import type { AskSigmaProvider } from './provider'
import { supportedQuestions } from './suggestedQuestions'
import { buildPublicTransportLink, detectRouteFromText, detectTransportDistrictFilters, detectTransportMode, formatTransportDistrictLabel } from './transportQuery'

const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined => String(plan.filters?.district ?? '').trim() || undefined
const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean => !district || incidentDistrict === district
const formatDistrictLabel = (district?: string): string => district ? `по району «${getDistrictAnswerName(district)}»` : ''
const matchesSubsystem = (incidentSubsystem: string, subsystem: string | undefined): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') return incidentSubsystem === 'heat' || incidentSubsystem === 'utilities'
  return incidentSubsystem.includes(subsystem.slice(0, 4))
}
const matchesRegulationSubsystem = (linkedIncidentTypes: string[], subsystem: string | undefined): boolean => {
  if (!subsystem) return true
  if (subsystem === 'energy') return linkedIncidentTypes.some((type) => type === 'heat' || type === 'utilities')
  return linkedIncidentTypes.some((type) => type.includes(subsystem.slice(0, 4)))
}

const getTransportData = (provider: AskSigmaProvider) => {
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

const toTitle = (district: string): string => `${getTransportDistrictLabel(district)} район`

export const executePlan = (
  plan: AskSigmaPlan,
  provider: AskSigmaProvider,
  role: SigmaRole,
  options?: { implicitDistrict?: string },
): AskSigmaResult => {
  const context = provider.getContext()
  const sourceStatuses = context.sourceStatuses ?? []
  const primaryStatus = sourceStatuses[0]
  const explainBase = { source: primaryStatus?.title ?? 'Sigma Zustand Store', updatedAt: primaryStatus?.updatedAt ?? context.now, dataType: primaryStatus?.type ?? 'calculated' as const }

  switch (plan.operation) {
    case 'NAVIGATE':
      return { type: 'NAVIGATE', title: 'Переход выполнен', summary: `Открываю раздел ${plan.route}`, actions: [{ label: 'Открыть', route: plan.route }], explain: explainBase }
    case 'SUMMARY': {
      const district = getRequestedDistrict(plan)
      const scopedIncidents = context.incidents.filter((incident) => matchesDistrict(district, incident.district))
      const liveIncidents = scopedIncidents.filter((incident) => incident.id.startsWith('051-'))
      const districtLabel = formatDistrictLabel(district)
      return {
        type: 'SUMMARY',
        title: 'Оперативная обстановка по ЖКХ',
        summary: `${districtLabel ? `Сейчас ${districtLabel}` : 'Сейчас'} активных событий ЖКХ: ${context.liveSummary?.activeIncidents ?? liveIncidents.length}. ${getOutageKindLabel('emergency', 'titlePlural')} домов: ${context.liveSummary?.emergencyHouses ?? 0}.`,
        kpis: [
          { label: 'События 051', value: String(context.liveSummary?.activeIncidents ?? liveIncidents.length) },
          { label: `${getOutageKindLabel('planned', 'titlePlural')} дома`, value: String(context.liveSummary?.plannedHouses ?? 0) },
          { label: `${getOutageKindLabel('emergency', 'titlePlural')} дома`, value: String(context.liveSummary?.emergencyHouses ?? 0) },
        ],
        actions: [{ label: 'Открыть монитор', route: '/operations', district }, { label: 'Открыть отчет', route: '/briefing' }],
        explain: { ...explainBase, dataType: 'real' },
      }
    }
    case 'BRIEFING':
      return {
        type: 'BRIEFING',
        title: 'Сводка за 24 часа',
        summary: `По 051 активных событий: ${context.liveSummary?.activeIncidents ?? 0}. ${getOutageKindLabel('emergency', 'titlePlural')} домов: ${context.liveSummary?.emergencyHouses ?? 0}.`,
        kpis: sourceStatuses.map((status) => ({ label: status.key, value: `${status.source}/${status.status}` })),
        actions: [{ label: 'Открыть сводку', route: '/briefing' }],
        explain: { ...explainBase, dataType: 'real' },
      }
    case 'FILTER': {
      const district = getRequestedDistrict(plan)
      const outageKind = String(plan.filters?.outageKind ?? '')
      const subsystem = String(plan.filters?.subsystem ?? '')
      const severity = String(plan.filters?.severity ?? '')
      const filtered = context.incidents
        .filter((incident) => matchesDistrict(district, incident.district))
        .filter((incident) => !outageKind || (incident.id.startsWith('051-') && String((incident as { liveMeta?: { outageKind?: string } }).liveMeta?.outageKind) === outageKind))
        .filter((incident) => matchesSubsystem(incident.subsystem, subsystem || undefined))
        .filter((incident) => !severity || incident.severity === severity)
        .slice(0, 6)
      return {
        type: 'INCIDENT_LIST',
        title: 'Найденные отключения',
        incidents: filtered,
        summary: `Найдено ${filtered.length} событий ${district ? formatDistrictLabel(district) : 'по городу'}.`,
        actions: [{ label: 'Открыть монитор', route: '/operations', district }],
        explain: { ...explainBase, dataType: filtered.some((incident) => incident.id.startsWith('051-')) ? 'real' : 'mock-fallback' },
      }
    }
    case 'INCIDENT_DETAIL': {
      const incident = context.incidents.find((item) => item.id === plan.incidentId) ?? context.incidents[0]
      const regulations = context.regulations.filter((regulation) => incident.linkedRegulationIds.includes(regulation.id))
      return {
        type: 'INCIDENT_DETAIL',
        title: `Карточка ${incident.id}`,
        incident,
        regulations,
        summary: `${incident.title}. Источник: ${incident.id.startsWith('051-') ? '051' : 'mock'}. Статус: ${incident.status}.`,
        actions: [{ label: 'Перейти в карточку', route: `/incidents/${incident.id}` }],
        explain: { ...explainBase, dataType: incident.id.startsWith('051-') ? 'real' : 'pilot' },
      }
    }
    case 'REGULATION_GUIDANCE': {
      const subsystem = String(plan.filters?.subsystem ?? '') || undefined
      const regulation = context.regulations.find((item) => matchesRegulationSubsystem(item.linkedIncidentTypes, subsystem)) ?? context.regulations[0]
      return { type: 'REGULATION_GUIDANCE', title: 'Рекомендации по регламенту', summary: `Для текущего кейса релевантен ${regulation.code} «${regulation.title}».`, regulations: [regulation], actions: [{ label: 'Открыть регламенты', route: '/regulations' }], explain: { ...explainBase, dataType: 'pilot' } }
    }
    case 'REGULATION_LOOKUP': {
      const regulations = context.regulations.slice(0, 3)
      return { type: 'REGULATION_LOOKUP', title: 'Найденные регламенты', regulations, summary: `Найдено ${regulations.length} правил`, actions: [{ label: 'Открыть регламенты', route: '/regulations' }], explain: { ...explainBase, dataType: 'pilot' } }
    }
    case 'HISTORY_TREND':
      return { type: 'HISTORY_ANALYTICS', title: 'История и аналитика', summary: 'История 051 snapshots накапливается и используется в аналитике вместе с hybrid/mock графиками.', actions: [{ label: 'Открыть историю', route: '/history' }], explain: { ...explainBase, dataType: 'calculated' } }
    case 'SCENARIO_LOOKUP': {
      const scenario = context.scenarios[0]
      return { type: 'SCENARIO_LOOKUP', title: scenario.title, scenario, summary: scenario.description, actions: [{ label: 'Открыть сценарий', route: '/scenarios' }], explain: { ...explainBase, dataType: 'simulation' } }
    }
    case 'SCENARIO_COMPARE':
      return { type: 'SCENARIO_COMPARE', title: 'Сравнение сценариев', compare: { baseline: 'Текущая ситуация', intervention: 'Сценарное вмешательство', effects: ['базовая картина сохранена', '-18% критичных инцидентов', '+8% нагрузка на службы'] }, actions: [{ label: 'Открыть сценарии', route: '/scenarios' }], explain: { ...explainBase, dataType: 'simulation' } }
    case 'DEPUTY_STATUS': {
      const deputy = context.deputies[0]
      return { type: 'DEPUTY_STATUS', title: deputy.name, deputy, summary: `Режим: ${deputy.mode}. Активных событий ЖКХ: ${context.liveSummary?.activeIncidents ?? 0}.`, actions: [{ label: 'Открыть заместителей', route: '/deputies' }], explain: { ...explainBase, dataType: 'pilot' } }
    }
    case 'DEPUTY_MODE_CHANGE': {
      const deputy = context.deputies[0]
      provider.setDeputyMode?.(deputy.id, 'approval')
      return { type: 'DEPUTY_MODE_CHANGE', title: 'Режим заместителя изменен', deputy: { ...deputy, mode: 'approval' }, summary: `${deputy.name} переведен в режим подтверждения`, explain: { ...explainBase, dataType: 'pilot' } }
    }
    case 'APPROVALS': {
      const approvals = context.incidents.filter((item) => item.status === 'эскалирован' || item.severity === 'критический').slice(0, 5).map((item) => ({ id: item.id, reason: `${item.severity}, статус ${item.status}`, initiator: item.assignee }))
      return { type: 'APPROVALS', title: 'Требуют согласования', approvals, summary: `Найдено ${approvals.length} объектов`, actions: [{ label: 'Открыть монитор', route: '/operations' }], explain: explainBase }
    }
    case 'LIVE_SOURCES':
      return {
        type: 'LIVE_SOURCE_STATUS',
        title: 'Статус источников',
        summary: sourceStatuses.map((status) => `${status.key}: ${status.source}/${status.status}`).join(' · '),
        sourceStatuses,
        actions: [{ label: 'Открыть отчет', route: '/briefing' }],
        explain: { ...explainBase, dataType: sourceStatuses.some((status) => status.type === 'mock-fallback') ? 'mock-fallback' : 'real' },
      }
    case 'PUBLIC_TRANSPORT_SUMMARY': {
      const { stops, fares, statuses, fallbackMode } = getTransportData(provider)
      const metrics = selectGlobalTransportMetrics(stops, fares)
      const refreshedAt = statuses.find((status) => status.updatedAt)?.updatedAt ?? stops[0]?.updatedAt ?? context.now
      const dataType = statuses.some((status) => status.dataType === 'real') ? 'real' : 'mock-fallback'
      return {
        type: 'PUBLIC_TRANSPORT_SUMMARY',
        title: 'Общественный транспорт',
        summary: fallbackMode
          ? 'Показываю последний сохраненный снимок. Данные по общественному транспорту сейчас недоступны в режиме прямого обновления.'
          : `Остановок: ${metrics.totalStops}, районов покрытия: ${metrics.districtCount}, уникальных маршрутов: ${metrics.totalUniqueRoutes}, доля павильонов: ${(metrics.pavilionShare * 100).toFixed(1)}%.`,
        kpis: [
          { label: 'Остановки', value: String(metrics.totalStops) },
          { label: 'Районы покрытия', value: String(metrics.districtCount) },
          { label: 'Маршруты', value: String(metrics.totalUniqueRoutes) },
          { label: 'Павильоны', value: `${(metrics.pavilionShare * 100).toFixed(1)}%` },
        ],
        actions: [
          { label: 'Открыть вкладку транспорта', route: buildPublicTransportLink() },
          { label: 'Показать на карте', route: buildPublicTransportLink({ focus: 'map' }) },
        ],
        explain: { source: 'opendata.novo-sibirsk.ru datasets 49/51', updatedAt: refreshedAt, dataType },
      }
    }
    case 'TRANSIT_STOPS': {
      const { stops } = getTransportData(provider)
      const explicitDistrict = detectTransportDistrictFilters(plan.text)[0]
      const implicitDistrict = options?.implicitDistrict
      const districtFilter = explicitDistrict?.district ?? (String(plan.filters?.districtLabel ?? '') || implicitDistrict || '')
      const withPavilion = Boolean(plan.filters?.pavilionOnly)
      const filtered = selectFilteredStops(stops, { district: districtFilter, mode: 'all', search: '', route: '', onlyPavilion: withPavilion })
      const topStops = filtered.slice(0, 8)
      const isCountMetric = String(plan.filters?.metric ?? '') === 'count'
      const appliedDistrictFilter = districtFilter ? {
        district: explicitDistrict ? formatTransportDistrictLabel(explicitDistrict) : districtFilter,
        rawLabel: explicitDistrict?.rawLabel,
        source: explicitDistrict ? 'explicit' as const : 'implicit' as const,
      } : undefined

      return {
        type: 'TRANSIT_STOPS',
        title: districtFilter ? `Остановки: ${toTitle(districtFilter)}` : 'Остановки общественного транспорта',
        summary: isCountMetric
          ? `В ${districtFilter ? toTitle(districtFilter) : 'городе'} найдено ${filtered.length} остановок${withPavilion ? ' с павильоном' : ''}.`
          : districtFilter
            ? `Найдено ${filtered.length} остановок ${withPavilion ? 'с павильоном ' : ''}в районе ${toTitle(districtFilter)}.`
            : `Найдено ${filtered.length} остановок по заданному фильтру.`,
        transportStops: topStops,
        appliedDistrictFilter,
        actions: [
          { label: 'На карте', route: buildPublicTransportLink({ district: districtFilter || undefined, pavilionOnly: withPavilion, focus: 'map' }) },
          { label: 'Открыть транспорт', route: buildPublicTransportLink({ district: districtFilter || undefined, pavilionOnly: withPavilion }) },
        ],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_ROUTE_LOOKUP': {
      const { stops } = getTransportData(provider)
      const routeNumber = String(plan.filters?.route ?? '') || detectRouteFromText(plan.text)
      const district = String(plan.filters?.district ?? '')
      const scopedStops = district ? selectFilteredStops(stops, { district, mode: 'all', search: '', route: '', onlyPavilion: false }) : stops
      const route = routeNumber ? selectRouteDetails(scopedStops, routeNumber) : undefined
      const routeStops = routeNumber ? selectStopsForRoute(scopedStops, routeNumber).slice(0, 8) : []
      return {
        type: 'TRANSIT_ROUTE_LOOKUP',
        title: routeNumber ? `Маршрут ${routeNumber}` : 'Маршруты общественного транспорта',
        summary: route
          ? `Маршрут встречается на ${route.stopCount} остановках в ${route.districtCount} районах.`
          : district
            ? `В районе ${toTitle(district)} найдено ${new Set(scopedStops.flatMap((stop) => stop.routesParsed.map((item) => item.number))).size} маршрутов.`
            : 'Уточните номер маршрута или район для подбора маршрутов.',
        transportStops: routeStops.length > 0 ? routeStops : scopedStops.slice(0, 8),
        transportRoute: route ? { route: route.routeId, stopCount: route.stopCount, districts: route.districts.map(getTransportDistrictLabel) } : undefined,
        actions: [
          { label: 'Показать маршрутные остановки', route: buildPublicTransportLink({ route: routeNumber || undefined, district: district || undefined, focus: 'list' }) },
          { label: 'Открыть на карте', route: buildPublicTransportLink({ route: routeNumber || undefined, district: district || undefined, focus: 'map' }) },
        ],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_HUBS': {
      const { stops, fares } = getTransportData(provider)
      const metrics = selectGlobalTransportMetrics(stops, fares)
      const hubs = metrics.topStopsByRouteCount.slice(0, 5)
      return {
        type: 'TRANSIT_HUBS',
        title: 'Остановки с наибольшим числом маршрутов',
        summary: `Показываю остановки с наибольшим числом маршрутов: ${hubs.slice(0, 3).map((stop) => `${stop.name} (${stop.routesParsed.length})`).join(' · ')}.`,
        transportStops: hubs,
        transportHubs: hubs.map((stop) => ({ name: stop.name, district: stop.district, routes: stop.routesParsed.length })),
        actions: [{ label: 'Открыть транспорт', route: buildPublicTransportLink({ focus: 'hubs' }) }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    }
    case 'TRANSIT_ROUTE_BETWEEN_DISTRICTS': {
      const { stops } = getTransportData(provider)
      const fromDistrict = String(plan.filters?.fromDistrict ?? '')
      const toDistrict = String(plan.filters?.toDistrict ?? '')
      const compare = selectDistrictConnectivity(stops, fromDistrict, toDistrict)
      return {
        type: 'TRANSIT_ROUTE_BETWEEN_DISTRICTS',
        title: 'Маршруты между районами',
        summary: fromDistrict && toDistrict
          ? `Между ${toTitle(fromDistrict)} и ${toTitle(toDistrict)} найдено ${compare.count} общих маршрутов.`
          : 'Уточните районы отправления и назначения.',
        transportRouteBetweenDistricts: fromDistrict && toDistrict ? {
          from: toTitle(fromDistrict),
          to: toTitle(toDistrict),
          commonRoutes: compare.commonRoutes,
          count: compare.count,
          examplesFrom: compare.examplesA.map((item) => item.name),
          examplesTo: compare.examplesB.map((item) => item.name),
          note: 'Это пересечение маршрутов по остановкам, а не точный роутинг door-to-door.',
        } : undefined,
        actions: [
          { label: 'Открыть транспорт', route: buildPublicTransportLink({ fromDistrict, toDistrict }) },
          { label: 'Показать на карте', route: buildPublicTransportLink({ fromDistrict, toDistrict, focus: 'map' }) },
        ],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    }
    case 'TRANSIT_DISTRICT_COMPARE': {
      const { stops } = getTransportData(provider)
      const from = detectTransportDistrictFilters(plan.text)[0]?.district ?? ''
      const to = detectTransportDistrictFilters(plan.text)[1]?.district ?? ''
      const connectivity = selectDistrictConnectivity(stops, from, to)
      const fromSummary = selectSelectedDistrictSummary(stops, from)
      const toSummary = selectSelectedDistrictSummary(stops, to)
      return {
        type: 'TRANSIT_DISTRICT_COMPARE',
        title: 'Сравнение районов по транспорту',
        summary: from && to
          ? `${toTitle(from)}: остановок ${fromSummary?.stopCount ?? 0}, маршрутов ${fromSummary?.uniqueRoutes ?? 0}. ${toTitle(to)}: остановок ${toSummary?.stopCount ?? 0}, маршрутов ${toSummary?.uniqueRoutes ?? 0}.`
          : 'Уточните два района для сравнения транспортного покрытия.',
        districtCompare: from && to ? { from: toTitle(from), to: toTitle(to), commonRoutes: connectivity.commonRoutes, count: connectivity.count } : undefined,
        actions: [{ label: 'Открыть транспорт', route: buildPublicTransportLink({ fromDistrict: from || undefined, toDistrict: to || undefined }) }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    }
    case 'TRANSIT_FARES': {
      const { fares } = getTransportData(provider)
      const mode = String(plan.filters?.mode ?? '') || detectTransportMode(plan.text)
      const cards = selectCurrentFareCards(fares)
        .filter((fare) => !mode || fare.mode === mode || (mode === 'bus' && fare.mode === 'unknown'))
        .slice(0, 8)
      return {
        type: 'TRANSIT_FARES',
        title: 'Тарифы общественного транспорта',
        summary: cards.map((fare) => `${fare.fareType}: ${fare.amount} ₽`).join(' · '),
        transportFares: cards,
        actions: [
          { label: 'Показать тарифы', route: buildPublicTransportLink({ mode: mode || undefined, focus: 'fares' }) },
          { label: 'Открыть транспорт', route: buildPublicTransportLink({ mode: mode || undefined }) },
        ],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 51', updatedAt: fares[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_NAVIGATE_TO_PAGE':
      return {
        type: 'TRANSIT_NAVIGATE_TO_PAGE',
        title: 'Открываю вкладку общественного транспорта',
        summary: 'Передаю фильтры в транспортный модуль.',
        actions: [{
          label: 'Открыть транспорт',
          route: buildPublicTransportLink({
            district: String(plan.filters?.district ?? '') || undefined,
            fromDistrict: String(plan.filters?.fromDistrict ?? '') || undefined,
            toDistrict: String(plan.filters?.toDistrict ?? '') || undefined,
            route: String(plan.filters?.route ?? '') || undefined,
            mode: String(plan.filters?.mode ?? '') || undefined,
            pavilionOnly: Boolean(plan.filters?.pavilionOnly),
            focus: String(plan.filters?.focus ?? '') || undefined,
          }),
        }],
        explain: { ...explainBase, dataType: 'calculated' },
      }
    case 'HELP':
      return {
        type: 'HELP',
        title: 'Что умеет Сигма',
        summary: `Сигма понимает запросы по 051, истории, транспорту и навигации для роли «${role}». По транспорту можно спрашивать про остановки по районам и маршрутам, тарифы, связность районов, покрытие и карту.`,
        hints: supportedQuestions,
        explain: explainBase,
      }
    default:
      return {
        type: 'UNKNOWN',
        title: 'Сигма пока не знает эту тему',
        summary: /транспорт|остановк|маршрут|тариф|проезд/i.test(plan.text)
          ? 'Уточните транспортный запрос. Например: «остановки в советском районе», «какие остановки у маршрута 36», «как проехать из академгородка в центральный район».'
          : 'Попробуйте один из поддерживаемых запросов ниже.',
        hints: supportedQuestions,
        explain: explainBase,
      }
  }
}
