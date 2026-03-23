import { getDistrictAnswerName } from '../../lib/districts'
import { defaultTransportFares, defaultTransportStops } from '../public-transport/data/defaultTransportData'
import { getTransportDistrictLabel, selectCurrentFareCards, selectDistrictConnectivity, selectFilteredStops, selectGlobalTransportMetrics, selectRouteDetails, selectStopsForRoute } from '../public-transport/selectors'
import type { AskSigmaHint, AskSigmaPlan, AskSigmaResult, SigmaRole } from './types'
import type { AskSigmaProvider } from './provider'

const supportedQuestions: AskSigmaHint[] = [
  { question: 'что происходит сейчас', description: 'общая оперативная обстановка, число активных и критичных событий.' },
  { question: 'отключения сейчас', description: 'текущая live-сводка по 051 и fallback-режим.' },
  { question: 'аварийные отключения', description: 'аварийные live-события по 051.' },
  { question: 'стройки по районам', description: 'агрегаты по open data 124/125.' },
  { question: 'события в кировском районе', description: 'поиск и фильтрация событий по конкретному району города.' },
  { question: 'общественный транспорт', description: 'сводка по остановкам, маршрутам и тарифам.' },
  { question: 'остановки в советском районе', description: 'поиск остановок по району.' },
  { question: 'какой тариф на автобус', description: 'карточки тарифов из dataset 51.' },
  { question: 'сколько общих маршрутов между советским и центральным', description: 'связность районов по пересечению маршрутов.' },
]

const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined => String(plan.filters?.district ?? '').trim() || undefined
const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean => !district || incidentDistrict === district
const formatDistrictLabel = (district?: string): string => district ? `по району «${getDistrictAnswerName(district)}»` : ''
const normalize = (value: string): string => value.toLowerCase().replace(/ё/g, 'е')

const getTransportData = (provider: AskSigmaProvider) => {
  const context = provider.getContext()
  return {
    context,
    stops: context.publicTransport?.stops ?? defaultTransportStops,
    fares: context.publicTransport?.fares ?? defaultTransportFares,
  }
}

const detectTransportRoute = (text: string): string | undefined => text.match(/маршрут[а-я\s]*?(\d+[a-zа-я-]*)/i)?.[1] ?? text.match(/\b(\d+[a-zа-я-]*)\b/i)?.[1]

const buildDistrictAliases = (district: string): string[] => {
  const normalized = normalize(district)
  const aliases = [normalized]
  if (normalized.endsWith('ский')) {
    const base = normalized.slice(0, -2)
    aliases.push(`${base}ого`, `${base}ому`, `${base}ом`, `${base}им`)
  }
  if (normalized.endsWith('ный')) {
    const base = normalized.slice(0, -2)
    aliases.push(`${base}ого`, `${base}ому`, `${base}ом`, `${base}ым`)
  }
  if (normalized.includes('совет')) aliases.push('академгородок', 'академгородке', 'академгородка')
  return aliases
}

const detectTransportDistricts = (text: string, availableDistricts: string[]): string[] => {
  const normalized = normalize(text)
  const aliases = availableDistricts.flatMap((district) => buildDistrictAliases(district).map((alias) => ({ alias, district })))

  return aliases.filter((item) => normalized.includes(item.alias)).map((item) => item.district).filter((district, index, list) => list.indexOf(district) === index)
}

export const executePlan = (plan: AskSigmaPlan, provider: AskSigmaProvider, role: SigmaRole): AskSigmaResult => {
  const context = provider.getContext()
  const sourceStatuses = context.sourceStatuses ?? []
  const constructionAggregates = context.constructionAggregates ?? []
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
        summary: `${districtLabel ? `Сейчас ${districtLabel}` : 'Сейчас'} live-событий ЖКХ: ${context.liveSummary?.activeIncidents ?? liveIncidents.length}. Аварийных домов: ${context.liveSummary?.emergencyHouses ?? 0}.`,
        kpis: [
          { label: 'Live incidents 051', value: String(context.liveSummary?.activeIncidents ?? liveIncidents.length) },
          { label: 'Плановые дома', value: String(context.liveSummary?.plannedHouses ?? 0) },
          { label: 'Аварийные дома', value: String(context.liveSummary?.emergencyHouses ?? 0) },
        ],
        actions: [{ label: 'Открыть монитор', route: '/operations', district }, { label: 'Открыть бриф', route: '/briefing' }],
        explain: { ...explainBase, dataType: 'real' },
      }
    }
    case 'BRIEFING':
      return {
        type: 'BRIEFING',
        title: 'Сводка за 24 часа',
        summary: `По 051 активных событий: ${context.liveSummary?.activeIncidents ?? 0}. По open data активных строек: ${constructionAggregates.reduce((sum, item) => sum + item.activeConstruction, 0)}.`,
        kpis: sourceStatuses.map((status) => ({ label: status.key, value: `${status.source}/${status.status}` })),
        actions: [{ label: 'Открыть сводку', route: '/briefing' }],
        explain: { ...explainBase, dataType: 'real' },
      }
    case 'FILTER': {
      const district = getRequestedDistrict(plan)
      const outageKind = String(plan.filters?.outageKind ?? '')
      const subsystem = String(plan.filters?.subsystem ?? '')
      const filtered = context.incidents
        .filter((incident) => matchesDistrict(district, incident.district))
        .filter((incident) => !outageKind || (incident.id.startsWith('051-') && String((incident as { liveMeta?: { outageKind?: string } }).liveMeta?.outageKind) === outageKind))
        .filter((incident) => !subsystem || incident.subsystem.includes(subsystem.slice(0, 4)))
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
      const regulation = context.regulations.find((item) => !plan.filters?.subsystem || item.linkedIncidentTypes.some((type) => type.includes(String(plan.filters?.subsystem ?? '').slice(0, 4)))) ?? context.regulations[0]
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
      return { type: 'SCENARIO_COMPARE', title: 'Сравнение сценариев', compare: { baseline: 'Текущая ситуация', intervention: 'Сценарное вмешательство', effects: ['live baseline сохранен', '-18% критичных инцидентов', '+8% нагрузка на службы'] }, actions: [{ label: 'Открыть сценарии', route: '/scenarios' }], explain: { ...explainBase, dataType: 'simulation' } }
    case 'DEPUTY_STATUS': {
      const deputy = context.deputies[0]
      return { type: 'DEPUTY_STATUS', title: deputy.name, deputy, summary: `Режим: ${deputy.mode}. Live-событий ЖКХ: ${context.liveSummary?.activeIncidents ?? 0}.`, actions: [{ label: 'Открыть заместителей', route: '/deputies' }], explain: { ...explainBase, dataType: 'pilot' } }
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
        title: 'Статус live-источников',
        summary: sourceStatuses.map((status) => `${status.key}: ${status.source}/${status.status}`).join(' · '),
        sourceStatuses,
        actions: [{ label: 'Открыть бриф', route: '/briefing' }],
        explain: { ...explainBase, dataType: sourceStatuses.some((status) => status.type === 'mock-fallback') ? 'mock-fallback' : 'real' },
      }
    case 'CONSTRUCTION': {
      const district = getRequestedDistrict(plan)
      const aggregates = district ? constructionAggregates.filter((item) => item.districtId === district) : constructionAggregates
      const title = district ? `Строительство: ${getDistrictAnswerName(district)}` : 'Строительная активность по районам'
      const summary = aggregates.length > 0
        ? aggregates.map((item) => `${item.districtName}: active ${item.activeConstruction}`).join(' · ')
        : 'Данных по выбранному району нет, показываю доступный snapshot open data.'
      return {
        type: 'CONSTRUCTION_AGGREGATES',
        title,
        summary,
        constructionAggregates: aggregates.slice(0, 8),
        actions: [{ label: 'Открыть историю', route: '/history' }, { label: 'Открыть бриф', route: '/briefing' }],
        explain: { ...explainBase, source: 'OpenData Novosibirsk', dataType: 'real' },
      }
    }
    case 'PUBLIC_TRANSPORT_SUMMARY': {
      const { stops, fares } = getTransportData(provider)
      const metrics = selectGlobalTransportMetrics(stops, fares)
      return {
        type: 'PUBLIC_TRANSPORT_SUMMARY',
        title: 'Общественный транспорт',
        summary: `Остановок: ${metrics.totalStops}, уникальных маршрутов: ${metrics.totalUniqueRoutes}, доля павильонов: ${(metrics.pavilionShare * 100).toFixed(1)}%.`,
        kpis: [
          { label: 'Остановки', value: String(metrics.totalStops) },
          { label: 'Маршруты', value: String(metrics.totalUniqueRoutes) },
          { label: 'Павильоны', value: `${(metrics.pavilionShare * 100).toFixed(1)}%` },
        ],
        actions: [{ label: 'Открыть вкладку', route: '/public-transport' }, { label: 'Показать на карте', route: '/public-transport?map=1' }],
        explain: { source: 'opendata.novo-sibirsk.ru datasets 49/51', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_STOPS': {
      const { stops } = getTransportData(provider)
      const districts = detectTransportDistricts(plan.text, Array.from(new Set(stops.map((stop) => stop.district))))
      const district = districts[0] ?? ''
      const withPavilion = /павильон/i.test(plan.text)
      const filtered = selectFilteredStops(stops, { district, mode: 'all', search: '', route: '', onlyPavilion: withPavilion }).slice(0, 8)
      return {
        type: 'TRANSIT_STOPS',
        title: district ? `Остановки: ${getTransportDistrictLabel(district)}` : 'Остановки общественного транспорта',
        summary: district ? `Найдено ${filtered.length} остановок ${withPavilion ? 'с павильоном ' : ''}в районе ${getTransportDistrictLabel(district)}.` : `Найдено ${filtered.length} остановок по заданному фильтру.`,
        transportStops: filtered,
        actions: [{ label: 'Открыть вкладку', route: `/public-transport${district ? `?district=${encodeURIComponent(district)}` : ''}` }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_ROUTE_LOOKUP': {
      const { stops, fares } = getTransportData(provider)
      const routeNumber = detectTransportRoute(plan.text)
      if (/топ транспортных узлов/i.test(plan.text) || !routeNumber) {
        const metrics = selectGlobalTransportMetrics(stops, fares)
        return {
          type: 'TRANSIT_ROUTE_LOOKUP',
          title: 'Топ транспортных узлов',
          summary: metrics.topStopsByRouteCount.slice(0, 3).map((stop) => `${stop.name} (${stop.routesParsed.length})`).join(' · '),
          transportStops: metrics.topStopsByRouteCount.slice(0, 8),
          actions: [{ label: 'Открыть вкладку', route: '/public-transport' }],
          explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
        }
      }

      const route = selectRouteDetails(stops, routeNumber)
      const routeStops = selectStopsForRoute(stops, routeNumber).slice(0, 8)
      return {
        type: 'TRANSIT_ROUTE_LOOKUP',
        title: `Маршрут ${routeNumber}`,
        summary: route ? `Маршрут встречается на ${route.stopCount} остановках в ${route.districtCount} районах.` : 'Маршрут не найден в локальном наборе.',
        transportStops: routeStops,
        transportRoute: route ? { route: route.routeId, stopCount: route.stopCount, districts: route.districts.map(getTransportDistrictLabel) } : undefined,
        actions: [{ label: 'Открыть вкладку', route: `/public-transport?route=${encodeURIComponent(routeNumber)}` }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'TRANSIT_DISTRICT_COMPARE': {
      const { stops } = getTransportData(provider)
      const districts = detectTransportDistricts(plan.text, Array.from(new Set(stops.map((stop) => stop.district))))
      const [from, to] = districts
      const compare = selectDistrictConnectivity(stops, from ?? '', to ?? '')
      return {
        type: 'TRANSIT_DISTRICT_COMPARE',
        title: 'Связность районов',
        summary: from && to ? `Между районами ${getTransportDistrictLabel(from)} и ${getTransportDistrictLabel(to)} найдено ${compare.count} общих маршрутов.` : 'Уточните два района для сравнения.',
        districtCompare: from && to ? { from: getTransportDistrictLabel(from), to: getTransportDistrictLabel(to), commonRoutes: compare.commonRoutes, count: compare.count } : undefined,
        actions: from && to ? [{ label: 'Открыть вкладку', route: `/public-transport?district=${encodeURIComponent(from)}&compareTo=${encodeURIComponent(to)}` }] : [{ label: 'Открыть вкладку', route: '/public-transport' }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 49', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    }
    case 'TRANSIT_FARES': {
      const { fares } = getTransportData(provider)
      const cards = selectCurrentFareCards(fares).slice(0, 6)
      return {
        type: 'TRANSIT_FARES',
        title: 'Тарифы общественного транспорта',
        summary: cards.map((fare) => `${fare.fareType}: ${fare.amount} ₽`).join(' · '),
        transportFares: cards,
        actions: [{ label: 'Открыть вкладку', route: '/public-transport' }],
        explain: { source: 'opendata.novo-sibirsk.ru dataset 51', updatedAt: fares[0]?.updatedAt ?? context.now, dataType: 'mock-fallback' },
      }
    }
    case 'HELP':
      return { type: 'HELP', title: 'Что умеет Сигма', summary: `Сигма понимает live-запросы по 051, open data, истории, транспорту и навигации для роли «${role}».`, hints: supportedQuestions, explain: explainBase }
    default:
      return { type: 'UNKNOWN', title: 'Сигма пока не знает эту тему', summary: 'Попробуйте один из поддерживаемых live-запросов ниже.', hints: supportedQuestions, explain: explainBase }
  }
}
