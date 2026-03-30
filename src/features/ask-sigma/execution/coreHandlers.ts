import { getOutageKindLabel } from '../../../live/outageKindLabels'
import { supportedQuestions } from '../suggestedQuestions'
import type { AskSigmaOperation } from '../types'
import type { AskSigmaExecutionHandler } from './context'
import {
  formatDistrictLabel,
  getRequestedDistrict,
  matchesDistrict,
  matchesRegulationSubsystem,
  matchesSubsystem,
} from './shared'

export const coreOperationHandlers: Partial<Record<AskSigmaOperation, AskSigmaExecutionHandler>> = {
  NAVIGATE: ({ plan, explainBase }) => ({
    type: 'NAVIGATE',
    title: 'Переход выполнен',
    summary: `Открываю раздел ${plan.route}`,
    actions: [{ label: 'Открыть', route: plan.route }],
    explain: explainBase,
  }),

  SUMMARY: ({ plan, context, explainBase }) => {
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
  },

  BRIEFING: ({ context, explainBase, sourceStatuses }) => ({
    type: 'BRIEFING',
    title: 'Сводка за 24 часа',
    summary: `По 051 активных событий: ${context.liveSummary?.activeIncidents ?? 0}. ${getOutageKindLabel('emergency', 'titlePlural')} домов: ${context.liveSummary?.emergencyHouses ?? 0}.`,
    kpis: sourceStatuses.map((status) => ({ label: status.key, value: `${status.source}/${status.status}` })),
    actions: [{ label: 'Открыть сводку', route: '/briefing' }],
    explain: { ...explainBase, dataType: 'real' },
  }),

  FILTER: ({ context, explainBase, plan }) => {
    const district = getRequestedDistrict(plan)
    const outageKind = String(plan.filters?.outageKind ?? '')
    const subsystem = String(plan.filters?.subsystem ?? '')
    const severity = String(plan.filters?.severity ?? '')
    const filtered = context.incidents
      .filter((incident) => matchesDistrict(district, incident.district))
      .filter(
        (incident) =>
          !outageKind ||
          (incident.id.startsWith('051-') &&
            String((incident as { liveMeta?: { outageKind?: string } }).liveMeta?.outageKind) === outageKind),
      )
      .filter((incident) => matchesSubsystem(incident.subsystem, subsystem || undefined))
      .filter((incident) => !severity || incident.severity === severity)
      .slice(0, 6)

    return {
      type: 'INCIDENT_LIST',
      title: 'Найденные отключения',
      incidents: filtered,
      summary: `Найдено ${filtered.length} событий ${district ? formatDistrictLabel(district) : 'по городу'}.`,
      actions: [{ label: 'Открыть монитор', route: '/operations', district }],
      explain: {
        ...explainBase,
        dataType: filtered.some((incident) => incident.id.startsWith('051-')) ? 'real' : 'mock-fallback',
      },
    }
  },

  INCIDENT_DETAIL: ({ context, explainBase, plan }) => {
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
  },

  REGULATION_GUIDANCE: ({ context, explainBase, plan }) => {
    const subsystem = String(plan.filters?.subsystem ?? '') || undefined
    const regulation =
      context.regulations.find((item) =>
        matchesRegulationSubsystem(item.linkedIncidentTypes, subsystem),
      ) ?? context.regulations[0]
    return {
      type: 'REGULATION_GUIDANCE',
      title: 'Рекомендации по регламенту',
      summary: `Для текущего кейса релевантен ${regulation.code} «${regulation.title}».`,
      regulations: [regulation],
      actions: [{ label: 'Открыть регламенты', route: '/regulations' }],
      explain: { ...explainBase, dataType: 'pilot' },
    }
  },

  REGULATION_LOOKUP: ({ context, explainBase }) => {
    const regulations = context.regulations.slice(0, 3)
    return {
      type: 'REGULATION_LOOKUP',
      title: 'Найденные регламенты',
      regulations,
      summary: `Найдено ${regulations.length} правил`,
      actions: [{ label: 'Открыть регламенты', route: '/regulations' }],
      explain: { ...explainBase, dataType: 'pilot' },
    }
  },

  HISTORY_TREND: ({ explainBase }) => ({
    type: 'HISTORY_ANALYTICS',
    title: 'История и аналитика',
    summary: 'История 051 snapshots накапливается и используется в аналитике вместе с hybrid/mock графиками.',
    actions: [{ label: 'Открыть историю', route: '/history' }],
    explain: { ...explainBase, dataType: 'calculated' },
  }),

  SCENARIO_LOOKUP: ({ context, explainBase }) => {
    const scenario = context.scenarios[0]
    return {
      type: 'SCENARIO_LOOKUP',
      title: scenario.title,
      scenario,
      summary: scenario.description,
      actions: [{ label: 'Открыть сценарий', route: '/scenarios' }],
      explain: { ...explainBase, dataType: 'simulation' },
    }
  },

  SCENARIO_COMPARE: ({ explainBase }) => ({
    type: 'SCENARIO_COMPARE',
    title: 'Сравнение сценариев',
    compare: {
      baseline: 'Текущая ситуация',
      intervention: 'Сценарное вмешательство',
      effects: ['базовая картина сохранена', '-18% критичных инцидентов', '+8% нагрузка на службы'],
    },
    actions: [{ label: 'Открыть сценарии', route: '/scenarios' }],
    explain: { ...explainBase, dataType: 'simulation' },
  }),

  DEPUTY_STATUS: ({ context, explainBase }) => {
    const deputy = context.deputies[0]
    return {
      type: 'DEPUTY_STATUS',
      title: deputy.name,
      deputy,
      summary: `Режим: ${deputy.mode}. Активных событий ЖКХ: ${context.liveSummary?.activeIncidents ?? 0}.`,
      actions: [{ label: 'Открыть заместителей', route: '/deputies' }],
      explain: { ...explainBase, dataType: 'pilot' },
    }
  },

  DEPUTY_MODE_CHANGE: ({ context, explainBase, provider }) => {
    const deputy = context.deputies[0]
    provider.setDeputyMode?.(deputy.id, 'approval')
    return {
      type: 'DEPUTY_MODE_CHANGE',
      title: 'Режим заместителя изменен',
      deputy: { ...deputy, mode: 'approval' },
      summary: `${deputy.name} переведен в режим подтверждения`,
      explain: { ...explainBase, dataType: 'pilot' },
    }
  },

  APPROVALS: ({ context, explainBase }) => {
    const approvals = context.incidents
      .filter((item) => item.status === 'эскалирован' || item.severity === 'критический')
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        reason: `${item.severity}, статус ${item.status}`,
        initiator: item.assignee,
      }))
    return {
      type: 'APPROVALS',
      title: 'Требуют согласования',
      approvals,
      summary: `Найдено ${approvals.length} объектов`,
      actions: [{ label: 'Открыть монитор', route: '/operations' }],
      explain: explainBase,
    }
  },

  LIVE_SOURCES: ({ explainBase, sourceStatuses }) => ({
    type: 'LIVE_SOURCE_STATUS',
    title: 'Статус источников',
    summary: sourceStatuses.map((status) => `${status.key}: ${status.source}/${status.status}`).join(' · '),
    sourceStatuses,
    actions: [{ label: 'Открыть отчет', route: '/briefing' }],
    explain: {
      ...explainBase,
      dataType: sourceStatuses.some((status) => status.type === 'mock-fallback') ? 'mock-fallback' : 'real',
    },
  }),

  HELP: ({ explainBase, role }) => ({
    type: 'HELP',
    title: 'Что умеет Сигма',
    summary: `Сигма понимает запросы по 051, истории, транспорту и навигации для роли «${role}». По транспорту можно спрашивать про остановки по районам и маршрутам, тарифы, связность районов, покрытие и карту.`,
    hints: supportedQuestions,
    explain: explainBase,
  }),
}
