import { getDistrictAnswerName } from '../../lib/districts'
import type { SigmaReferenceObject } from '../../live/types'
import type { AskSigmaHint, AskSigmaPlan, AskSigmaResult, SigmaRole } from './types'
import type { AskSigmaProvider } from './provider'

const supportedQuestions: AskSigmaHint[] = [
  { question: 'что происходит сейчас', description: 'общая оперативная обстановка, число активных и критичных событий.' },
  { question: 'отключения сейчас', description: 'текущая live-сводка по 051 и fallback-режим.' },
  { question: 'качество воздуха в городе', description: 'AQI, PM2.5, PM10, температура и источник данных.' },
  { question: 'риски для жизни в городе', description: 'декларативные risk cards по погоде и качеству воздуха.' },
  { question: 'индекс дорожной нагрузки', description: 'calculated traffic index по районам с объяснением факторов.' },
  { question: 'камеры в ленинском районе', description: 'reference layer камер ПДД на карте.' },
  { question: 'больницы в районе', description: 'справочный слой медицинской инфраструктуры.' },
  { question: 'активные стройки', description: 'active construction = permits - commissioned.' },
  { question: 'школы в советском районе', description: 'социальная инфраструктура и справочные объекты.' },
  { question: 'покажи live-источники', description: 'статус источников, TTL и обновление.' },
  { question: 'события в кировском районе', description: 'поиск и фильтрация событий по конкретному району города.' },
]

const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined => String(plan.filters?.district ?? '').trim() || undefined
const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean => !district || incidentDistrict === district
const formatDistrictLabel = (district?: string): string => district ? `по району «${getDistrictAnswerName(district)}»` : ''

const filterReferenceByDistrict = (objects: SigmaReferenceObject[] = [], district?: string, category?: SigmaReferenceObject['category']) => objects.filter((item) => (!district || item.districtId === district) && (!category || item.category === category))

export const executePlan = (plan: AskSigmaPlan, provider: AskSigmaProvider, role: SigmaRole): AskSigmaResult => {
  const context = provider.getContext()
  const sourceStatuses = context.sourceStatuses ?? []
  const constructionAggregates = context.constructionAggregates ?? []
  const indicators = context.indicators ?? []
  const referenceObjects = context.referenceObjects ?? []
  const riskCards = context.riskCards ?? []
  const trafficIndex = context.trafficIndex ?? []
  const transitRoutes = context.transitRoutes ?? []
  const primaryStatus = sourceStatuses[0]
  const explainBase = {
    source: primaryStatus?.name ?? primaryStatus?.id ?? 'Sigma Zustand Store',
    updatedAt: primaryStatus?.lastUpdated ?? context.now,
    dataType: (primaryStatus?.dataCategory === 'calculated'
      ? 'calculated'
      : primaryStatus?.dataCategory === 'simulation'
        ? 'simulation'
        : primaryStatus?.dataCategory === 'reference'
          ? 'pilot'
          : 'real') as 'real' | 'calculated' | 'simulation' | 'pilot' | 'mock-fallback',
  }

  switch (plan.operation) {
    case 'NAVIGATE':
      return { type: 'NAVIGATE', title: 'Переход выполнен', summary: `Открываю раздел ${plan.route}`, actions: [{ label: 'Открыть', route: plan.route }], explain: explainBase }
    case 'SUMMARY':
    case 'UTILITIES_STATUS': {
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
    case 'UTILITIES_PLANNED':
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
    case 'BRIEFING':
      return {
        type: 'BRIEFING',
        title: 'Сводка за 24 часа',
        summary: `По 051 активных событий: ${context.liveSummary?.activeIncidents ?? 0}. По open data активных строек: ${constructionAggregates.reduce((sum, item) => sum + item.activeConstruction, 0)}.`,
        kpis: sourceStatuses.slice(0, 6).map((status) => ({ label: status.id, value: `${status.origin}/${status.status}` })),
        actions: [{ label: 'Открыть сводку', route: '/briefing' }],
        explain: { ...explainBase, dataType: 'real' },
      }
    case 'ECO_STATUS':
    case 'ECO_PDK':
    case 'ECO_HISTORY': {
      return {
        type: 'ECOLOGY_STATUS',
        title: 'Экология и погода',
        summary: `AQI: ${indicators.find((item) => item.metric === 'aqi')?.value ?? '—'}, PM2.5: ${indicators.find((item) => item.metric === 'pm25')?.value ?? '—'} µg/m³, температура: ${indicators.find((item) => item.metric === 'temperature')?.value ?? '—'} °C.`,
        indicators: indicators.slice(0, 6),
        actions: [{ label: 'Открыть историю', route: '/history' }, { label: 'Открыть монитор', route: '/operations' }],
        explain: { source: 'Open-Meteo', updatedAt: indicators[0]?.updatedAt ?? context.now, dataType: 'real' },
      }
    }
    case 'ECO_RISKS':
      return {
        type: 'ECOLOGY_RISKS',
        title: 'Риски по экологии и погоде',
        summary: riskCards.map((item) => `${item.title}: ${item.explanation.because.join(', ')}`).join(' · ') || 'Срабатываний правил не обнаружено.',
        riskCards,
        indicators: indicators.slice(0, 6),
        actions: [{ label: 'Открыть бриф', route: '/briefing' }, { label: 'Открыть монитор', route: '/operations' }],
        explain: { source: 'Open-Meteo + Sigma rules', updatedAt: riskCards[0]?.triggeredAt ?? context.now, dataType: 'calculated' },
      }
    case 'TRAFFIC_INDEX': {
      const district = getRequestedDistrict(plan)
      const scoped = district ? trafficIndex.filter((item) => item.districtId === district) : trafficIndex
      return {
        type: 'TRAFFIC_INDEX',
        title: district ? `Traffic index: ${getDistrictAnswerName(district)}` : 'Индекс дорожной нагрузки',
        summary: scoped.map((item) => `${item.districtName}: ${item.score}`).join(' · '),
        trafficIndex: scoped.slice(0, 8),
        actions: [{ label: 'Открыть монитор', route: '/operations', district }, { label: 'Открыть историю', route: '/history' }],
        explain: { source: 'Sigma calculated traffic index', updatedAt: scoped[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    }
    case 'TRANSIT_ROUTE':
      return {
        type: 'TRANSIT_ROUTE',
        title: 'Маршрут между районами',
        summary: transitRoutes[0]?.summary ?? 'Маршрутный граф пока доступен только для базовых районных связей.',
        transitRoutes,
        actions: [{ label: 'Открыть карту', route: '/operations' }],
        explain: { source: 'OpenData stops + Sigma route discovery', updatedAt: transitRoutes[0]?.updatedAt ?? context.now, dataType: 'calculated' },
      }
    case 'TRANSIT_DISTRICTS': {
      const district = getRequestedDistrict(plan)
      const stops = filterReferenceByDistrict(referenceObjects, district, 'stop')
      return {
        type: 'DIRECTORY_LIST',
        title: district ? `Остановки ${formatDistrictLabel(district)}` : 'Остановки по районам',
        summary: `Найдено ${stops.length} остановок.`,
        referenceObjects: stops,
        actions: [{ label: 'Открыть карту', route: '/operations', district }],
        explain: { source: 'OpenData stops', updatedAt: stops[0]?.updatedAt ?? context.now, dataType: 'real' },
      }
    }
    case 'CAMERAS_FILTER': {
      const district = getRequestedDistrict(plan)
      const cameras = filterReferenceByDistrict(referenceObjects, district, 'camera')
      return {
        type: 'REFERENCE_MAP',
        title: district ? `Камеры ПДД ${formatDistrictLabel(district)}` : 'Камеры ПДД',
        summary: `Найдено ${cameras.length} справочных точек контроля. Это reference layer, а не live-инциденты.`,
        referenceObjects: cameras,
        actions: [{ label: 'Открыть карту', route: '/operations', district }],
        explain: { source: 'OSM Overpass', updatedAt: cameras[0]?.updatedAt ?? context.now, dataType: 'pilot' },
      }
    }
    case 'MEDICAL_FILTER': {
      const district = getRequestedDistrict(plan)
      const medical = filterReferenceByDistrict(referenceObjects, district, 'medical')
      return {
        type: 'REFERENCE_MAP',
        title: district ? `Медучреждения ${formatDistrictLabel(district)}` : 'Медицинская инфраструктура',
        summary: `Найдено ${medical.length} объектов медицинской инфраструктуры.`,
        referenceObjects: medical,
        actions: [{ label: 'Открыть карту', route: '/operations', district }],
        explain: { source: 'OSM Overpass', updatedAt: medical[0]?.updatedAt ?? context.now, dataType: 'pilot' },
      }
    }
    case 'CONSTRUCTION':
    case 'CONSTRUCTION_GROUP':
    case 'CONSTRUCTION_ACTIVE':
    case 'CONSTRUCTION_COMMISSIONED': {
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
    case 'DIRECTORY_FILTER':
    case 'DIRECTORY_TOP_N': {
      const district = getRequestedDistrict(plan)
      const text = plan.text.toLowerCase()
      const category: SigmaReferenceObject['category'] | undefined = text.includes('школ') ? 'school' : text.includes('дет') ? 'kindergarten' : text.includes('библиот') ? 'library' : text.includes('аптек') ? 'pharmacy' : text.includes('культур') ? 'culture' : text.includes('парков') ? 'parking' : text.includes('спорт') ? 'sport_org' : undefined
      const objects = filterReferenceByDistrict(referenceObjects, district, category)
      return {
        type: 'DIRECTORY_LIST',
        title: district ? `Справочные объекты ${formatDistrictLabel(district)}` : 'Социальная инфраструктура',
        summary: `Найдено ${objects.length} объектов.`,
        referenceObjects: objects,
        actions: [{ label: 'Открыть карту', route: '/operations', district }],
        explain: { source: 'OpenData directories', updatedAt: objects[0]?.updatedAt ?? context.now, dataType: 'pilot' },
      }
    }
    case 'SOURCE_STATUS':
    case 'LIVE_SOURCES':
      return {
        type: 'LIVE_SOURCE_STATUS',
        title: 'Статус live-источников',
        summary: sourceStatuses.map((status) => `${status.id}: ${status.origin}/${status.status}`).join(' · '),
        sourceStatuses,
        actions: [{ label: 'Открыть источники', route: '/sources' }],
        explain: { ...explainBase, dataType: sourceStatuses.some((status) => status.dataCategory === 'calculated') ? 'calculated' : sourceStatuses.some((status) => status.status !== 'ready') ? 'mock-fallback' : 'real' },
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
    case 'UTILITIES_HISTORY':
      return { type: 'HISTORY_ANALYTICS', title: 'История и аналитика', summary: 'История 051 snapshots накапливается и используется в аналитике вместе с hybrid/mock графиками, экологией и traffic index.', actions: [{ label: 'Открыть историю', route: '/history' }], explain: { ...explainBase, dataType: 'calculated' } }
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
    case 'HELP':
      return { type: 'HELP', title: 'Что умеет Сигма', summary: `Сигма понимает live-запросы по 051, open data, экологии, транспорту, строительству и картографическим reference layers для роли «${role}».`, hints: supportedQuestions, explain: explainBase }
    default:
      return { type: 'UNKNOWN', title: 'Сигма пока не знает эту тему', summary: 'Попробуйте один из поддерживаемых live-запросов ниже.', hints: supportedQuestions, explain: explainBase }
  }
}
