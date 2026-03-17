import { getDistrictAnswerName } from '../../lib/districts'
import type { AskSigmaHint, AskSigmaPlan, AskSigmaResult, SigmaRole } from './types'
import type { AskSigmaProvider } from './provider'

const supportedQuestions: AskSigmaHint[] = [
  { question: 'что происходит сейчас', description: 'общая оперативная обстановка, число активных и критичных событий.' },
  { question: 'сводка за 24 часа', description: 'короткая управленческая сводка по последним суткам.' },
  { question: 'что требует согласования', description: 'список инцидентов и эскалаций, где нужно управленческое решение.' },
  { question: 'критичные инциденты по отоплению', description: 'быстрый срез по самому чувствительному контуру.' },
  { question: 'инциденты по дорогам', description: 'нагрузка по дорожной подсистеме без лишних деталей.' },
  { question: 'события в кировском районе', description: 'поиск и фильтрация событий по конкретному району города.' },
  { question: 'динамика отключений за неделю', description: 'тренд и метрики по истории.' },
]

const getRequestedDistrict = (plan: AskSigmaPlan): string | undefined => {
  const district = String(plan.filters?.district ?? '').trim()
  return district || undefined
}

const matchesDistrict = (district: string | undefined, incidentDistrict: string): boolean =>
  !district || incidentDistrict === district

const formatDistrictLabel = (district?: string): string =>
  district ? `по району «${getDistrictAnswerName(district)}»` : ''

export const executePlan = (plan: AskSigmaPlan, provider: AskSigmaProvider, role: SigmaRole): AskSigmaResult => {
  const context = provider.getContext()
  const explainBase = { source: 'Sigma Zustand Store', updatedAt: context.now as string, dataType: 'calculated' as const }

  switch (plan.operation) {
    case 'NAVIGATE':
      return { type: 'NAVIGATE', title: 'Переход выполнен', summary: `Открываю раздел ${plan.route}`, actions: [{ label: 'Открыть', route: plan.route }], explain: explainBase }
    case 'SUMMARY': {
      const district = getRequestedDistrict(plan)
      const scopedIncidents = context.incidents.filter((incident) => matchesDistrict(district, incident.district))
      const districtLabel = formatDistrictLabel(district)
      const critical = scopedIncidents.filter((incident) => incident.severity === 'критический').length
      const active = scopedIncidents.filter((incident) => incident.status !== 'архив' && incident.status !== 'решен').length
      return {
        type: 'SUMMARY',
        title: 'Оперативная обстановка по городу',
        summary: `${districtLabel ? `Сейчас ${districtLabel}` : 'Сейчас'} активных событий: ${active}. Критичных: ${critical}. Основная нагрузка на службы по дорожному и тепловому контурам.`,
        kpis: [
          { label: 'Активные инциденты', value: String(active) },
          { label: 'Критичные', value: String(critical) },
          { label: 'Служб с SLA>80%', value: String(context.servicePerformance.filter((item) => item.resolvedInTime >= 80).length) },
        ],
        actions: [{ label: 'Открыть сводку', route: '/briefing' }, { label: 'Показать инциденты', route: '/operations', district }, { label: 'Открыть карту', route: '/operations', district }],
        explain: { ...explainBase, dataType: 'real' },
      }
    }
    case 'BRIEFING':
      return {
        type: 'BRIEFING',
        title: 'Сводка за 24 часа',
        summary: 'Существенных отклонений не выявлено. Есть рост аварийности по тепловому контуру и дорожной подсистеме в пиковые часы.',
        kpis: context.servicePerformance.slice(0, 4).map((item) => ({ label: item.service, value: `${item.resolvedInTime}%` })),
        actions: [{ label: 'Открыть сводку', route: '/briefing' }],
        explain: explainBase,
      }
    case 'FILTER': {
      const district = getRequestedDistrict(plan)
      const filtered = context.incidents
        .filter((incident) => matchesDistrict(district, incident.district) && (!plan.filters?.severity || incident.severity === plan.filters.severity) && (!plan.filters?.subsystem || incident.subsystem.includes(String(plan.filters?.subsystem ?? '').slice(0, 4))))
        .slice(0, 6)
      const districtLabel = formatDistrictLabel(district)
      return { type: 'INCIDENT_LIST', title: 'Найденные инциденты', incidents: filtered, summary: `Найдено ${filtered.length} событий${districtLabel ? ` ${districtLabel}` : ''}`, actions: [{ label: 'Открыть', route: '/operations', district }], explain: { ...explainBase, dataType: 'real' } }
    }
    case 'INCIDENT_DETAIL': {
      const incident = context.incidents.find((item) => item.id === plan.incidentId) ?? context.incidents[0]
      const regulations = context.regulations.filter((regulation) => incident.linkedRegulationIds.includes(regulation.id))
      return {
        type: 'INCIDENT_DETAIL',
        title: `Карточка ${incident.id}`,
        incident,
        regulations,
        summary: `${incident.title}. Статус: ${incident.status}. Ответственный: ${incident.assignee}.`,
        actions: [{ label: 'Перейти в карточку', route: `/incidents/${incident.id}`, incidentId: incident.id }, { label: 'На карте', route: '/operations', district: incident.district }],
        explain: { ...explainBase, dataType: 'real' },
      }
    }
    case 'REGULATION_GUIDANCE': {
      const reg = context.regulations.find((item) => !plan.filters?.subsystem || item.linkedIncidentTypes.some((type) => type.includes(String(plan.filters?.subsystem ?? '').slice(0, 4)))) ?? context.regulations[0]
      return {
        type: 'REGULATION_GUIDANCE',
        title: 'Рекомендации по регламенту',
        summary: `Что произошло: аварийное событие. Найден регламент ${reg.code} «${reg.title}». Предписано уведомить ответственные службы и зафиксировать действия в журнале.`,
        regulations: [reg],
        actions: [{ label: 'Открыть регламенты', route: '/regulations' }],
        explain: { ...explainBase, dataType: 'pilot' },
      }
    }
    case 'REGULATION_LOOKUP': {
      const regulations = context.regulations.filter((item) => !plan.filters?.subsystem || item.linkedIncidentTypes.some((type) => type.includes(String(plan.filters?.subsystem).slice(0, 4)))).slice(0, 3)
      return { type: 'REGULATION_LOOKUP', title: 'Найденные регламенты', regulations, summary: `Найдено ${regulations.length} подходящих правил`, actions: [{ label: 'Открыть регламенты', route: '/regulations' }], explain: explainBase }
    }
    case 'HISTORY_TREND':
      return {
        type: 'HISTORY_ANALYTICS',
        title: 'История и аналитика',
        summary: 'За выбранный период видно снижение среднего времени реакции и рост числа обращений в дорожном контуре.',
        kpis: context.servicePerformance.slice(0, 3).map((item) => ({ label: item.service, value: `${item.avgMinutes} мин` })),
        actions: [{ label: 'Открыть историю', route: '/history' }],
        explain: { ...explainBase, dataType: 'calculated' },
      }
    case 'SCENARIO_LOOKUP': {
      const scenario = context.scenarios.find((item) => /мороз|снег|ветер|шум/i.test(item.title.toLowerCase())) ?? context.scenarios[0]
      return { type: 'SCENARIO_LOOKUP', title: scenario.title, scenario, summary: scenario.description, actions: [{ label: 'Открыть сценарий', route: '/scenarios' }], explain: { ...explainBase, dataType: 'simulation' } }
    }
    case 'SCENARIO_COMPARE':
      return {
        type: 'SCENARIO_COMPARE',
        title: 'Сравнение сценариев',
        compare: { baseline: 'Без вмешательства', intervention: 'С вмешательством', effects: ['-18% критичных инцидентов', '-11 мин среднее время реакции', '+8% нагрузка на службы'] },
        actions: [{ label: 'Открыть сценарий', route: '/scenarios' }],
        explain: { ...explainBase, dataType: 'simulation' },
      }
    case 'DEPUTY_STATUS': {
      const deputy = context.deputies.find((item) => !plan.filters?.subsystem || item.name.toLowerCase().includes(String(plan.filters?.subsystem ?? '').slice(0, 4))) ?? context.deputies[0]
      return { type: 'DEPUTY_STATUS', title: deputy.name, deputy, summary: `Режим: ${deputy.mode}. Активных событий: ${deputy.activeIncidentIds.length}.`, actions: [{ label: 'Открыть заместителя', route: '/deputies' }], explain: { ...explainBase, dataType: 'pilot' } }
    }
    case 'DEPUTY_MODE_CHANGE': {
      const deputy = context.deputies.find((item) => !plan.filters?.subsystem || item.name.toLowerCase().includes(String(plan.filters?.subsystem ?? '').slice(0, 4))) ?? context.deputies[0]
      provider.setDeputyMode?.(deputy.id, 'approval')
      return { type: 'DEPUTY_MODE_CHANGE', title: 'Режим заместителя изменен', deputy: { ...deputy, mode: 'approval' }, summary: `${deputy.name} переведен в режим подтверждения`, explain: explainBase }
    }
    case 'APPROVALS': {
      const district = getRequestedDistrict(plan)
      const approvals = context.incidents
        .filter((item) => matchesDistrict(district, item.district) && (item.status === 'эскалирован' || item.severity === 'критический'))
        .slice(0, 5)
        .map((item) => ({ id: item.id, reason: `${item.severity}, статус ${item.status}`, initiator: item.assignee }))
      const districtLabel = formatDistrictLabel(district)
      return { type: 'APPROVALS', title: 'Требуют согласования', approvals, summary: `Найдено ${approvals.length} объектов${districtLabel ? ` ${districtLabel}` : ''}`, actions: [{ label: 'Открыть', route: '/operations', district }], explain: explainBase }
    }
    case 'HELP':
      return {
        type: 'HELP',
        title: 'Что умеет Сигма',
        summary: `Сигма сейчас поддерживает оперативные вопросы, историю, сценарии, статусы цифровых заместителей и переходы по разделам для роли «${role}».`,
        hints: supportedQuestions,
        explain: explainBase,
      }
    default:
      return {
        type: 'UNKNOWN',
        title: 'Сигма пока не знает эту тему',
        summary: 'На такой вопрос у меня пока нет готового ответа. Ниже список запросов, которые Сигма уже понимает.',
        hints: supportedQuestions,
        explain: explainBase,
      }
  }
}
