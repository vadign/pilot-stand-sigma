import { getDistrictName } from '../../lib/districts'
import type { LiveIncidentView } from '../../live/types'
import type { IncidentReplayAffectedObject, IncidentReplayScenario } from './types'

const utilityLabels: Record<string, string> = {
  heating: 'отопление',
  hot_water: 'горячая вода',
  cold_water: 'холодная вода',
  sewer: 'водоотведение',
  electricity: 'электроснабжение',
  gas: 'газоснабжение',
}

const affectedObjects: IncidentReplayAffectedObject[] = [
  { id: 'house-1', label: 'МКД 1', shortLabel: 'Дом 1', kind: 'apartment', x: 170, y: 88 },
  { id: 'house-2', label: 'МКД 2', shortLabel: 'Дом 2', kind: 'apartment', x: 398, y: 74 },
  { id: 'house-3', label: 'МКД 3', shortLabel: 'Дом 3', kind: 'apartment', x: 690, y: 108 },
  { id: 'kindergarten-1', label: 'Детский сад', shortLabel: 'Детсад', kind: 'kindergarten', x: 262, y: 312 },
  { id: 'admin-1', label: 'Административное здание', shortLabel: 'Админ', kind: 'administrative', x: 618, y: 318 },
]

const getSourceLabel = (incident: LiveIncidentView): string =>
  incident.sourceKind === 'live'
    ? '051 + демонстрационное воспроизведение'
    : 'демонстрационный контур Сигмы + воспроизведение'

const getResourceLabel = (incident: LiveIncidentView): string =>
  incident.liveMeta?.utilityType ? utilityLabels[incident.liveMeta.utilityType] ?? 'отопление' : 'отопление'

export const buildDemoIncidentReplayScenario = (
  incident: LiveIncidentView,
): IncidentReplayScenario => {
  const districtLabel = getDistrictName(incident.district)
  const resourceLabel = getResourceLabel(incident)

  return {
    incidentId: incident.id,
    incidentTitle: incident.title,
    incidentStatus: incident.status,
    districtLabel,
    sourceLabel: getSourceLabel(incident),
    detectedAt: incident.detectedAt,
    resourceLabel,
    baselineSummary:
      `${districtLabel} район, подземная предизолированная труба, зимний период, высокая нагрузка на сеть. ` +
      `Участок питает три многоквартирных дома, один детский сад и административное здание.`,
    networkLabel: 'Участок магистральной теплосети',
    pipeTypeLabel: 'подземная предизолированная труба',
    seasonLabel: 'зима',
    loadLabel: 'высокая нагрузка',
    affectedObjects,
    events: [
      {
        id: 't-minus-72h',
        offsetMinutes: -72 * 60,
        relativeTimeLabel: 'T-72ч',
        phase: 'before',
        category: 'ранний слабый сигнал',
        title: 'Зафиксирован ранний признак деградации участка',
        description:
          'Система фиксирует первое отклонение по участку: рост влажности в изоляции и тревожный сигнал по состоянию участка.',
        probability: 25,
        recommendations: [
          'Усилить мониторинг участка.',
          'Назначить диагностику теплотрассы.',
          'Проверить соседние сигналы по смежным камерам.',
        ],
        status: 'warning-low',
        isMilestone: true,
        keySignals: ['Рост влажности в изоляции', 'Первичный тревожный сигнал по участку'],
        affectedObjectIds: [],
        visualState: {
          pipeSeverity: 'normal',
          highlightedObjectIds: [],
          impactRadius: 0,
          impactOpacity: 0,
          signalKinds: ['moisture'],
          showRupture: false,
          zoneLabel: 'Слабый диагностический сигнал без влияния на потребителей',
        },
      },
      {
        id: 't-minus-36h',
        offsetMinutes: -36 * 60,
        relativeTimeLabel: 'T-36ч',
        phase: 'before',
        category: 'подтверждающая аномалия',
        title: 'Обнаружена подтверждающая аномалия',
        description:
          'Появляются дополнительные отклонения: аномальная теплопотеря, нестабильность параметров подачи и обратки, нетипичное поведение участка для текущей нагрузки.',
        probability: 50,
        recommendations: [
          'Отправить инспекцию на участок.',
          'Локализовать вероятную зону дефекта.',
          'Подготовить аварийную бригаду в резерв.',
        ],
        status: 'warning-medium',
        isMilestone: true,
        keySignals: ['Аномальная теплопотеря', 'Нестабильность подачи/обратки'],
        affectedObjectIds: ['house-1'],
        visualState: {
          pipeSeverity: 'warning',
          highlightedObjectIds: ['house-1'],
          impactRadius: 46,
          impactOpacity: 0.08,
          signalKinds: ['moisture', 'heat-loss'],
          showRupture: false,
          zoneLabel: 'Аномалия локализуется вокруг участка с первым влиянием на ближний контур',
        },
      },
      {
        id: 't-minus-18h',
        offsetMinutes: -18 * 60,
        relativeTimeLabel: 'T-18ч',
        phase: 'before',
        category: 'срабатывание правила',
        title: 'Система классифицировала участок как рискованный',
        description:
          'Сработало правило эксплуатации: ранний сигнал не снят, вторичная аномалия подтверждена, отклонение сохраняется дольше порога.',
        probability: 68,
        recommendations: [
          'Организовать выезд диагностики.',
          'Превентивно ограничить режим на участке.',
          'Подготовить ремонт в окно минимальной нагрузки.',
        ],
        status: 'rule-triggered',
        isMilestone: true,
        keySignals: ['Сигнал не снят по порогу времени', 'Подтверждена устойчивая аномалия'],
        affectedObjectIds: ['house-1', 'house-2'],
        visualState: {
          pipeSeverity: 'warning',
          highlightedObjectIds: ['house-1', 'house-2'],
          impactRadius: 72,
          impactOpacity: 0.12,
          signalKinds: ['moisture', 'heat-loss', 'pressure'],
          showRupture: false,
          zoneLabel: 'Риск признан эксплуатационным правилом и требует превентивных действий',
        },
      },
      {
        id: 't-minus-6h',
        offsetMinutes: -6 * 60,
        relativeTimeLabel: 'T-6ч',
        phase: 'before',
        category: 'предаварийная фаза',
        title: 'Развитие дефекта перешло в предаварийную фазу',
        description:
          'Растет подпитка, усиливается падение давления, участок выбивается из нормального режима.',
        probability: 83,
        recommendations: [
          'Немедленно локализовать участок.',
          'Перевести контур на аварийный контроль.',
          'Подготовить переключения и обходные схемы.',
        ],
        status: 'warning-high',
        isMilestone: true,
        keySignals: ['Рост подпитки', 'Падение давления', 'Нестабильный режим участка'],
        affectedObjectIds: ['house-1', 'house-2', 'kindergarten-1'],
        visualState: {
          pipeSeverity: 'risk',
          highlightedObjectIds: ['house-1', 'house-2', 'kindergarten-1'],
          impactRadius: 110,
          impactOpacity: 0.18,
          signalKinds: ['pressure', 'flow'],
          showRupture: false,
          zoneLabel: 'Предаварийное состояние, окно для мягкого вмешательства быстро закрывается',
        },
      },
      {
        id: 't-zero',
        offsetMinutes: 0,
        relativeTimeLabel: 'T-0',
        phase: 'incident',
        category: 'аварийный инцидент',
        title: 'Аварийный прорыв участка',
        description:
          'Произошла разгерметизация участка с выходом теплоносителя. Давление резко изменилось, статус стал критичным, затронутые объекты проявились в контуре воздействия.',
        probability: 100,
        recommendations: [
          'Локализовать повреждение.',
          'Активировать аварийный сценарий.',
          'Оценить влияние на потребителей.',
          'Сформировать поручения ответственным службам.',
        ],
        status: 'critical',
        isMilestone: true,
        keySignals: ['Разгерметизация', 'Критическое падение давления', 'Затронутые объекты на карте'],
        affectedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
        visualState: {
          pipeSeverity: 'critical',
          highlightedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
          impactRadius: 156,
          impactOpacity: 0.24,
          signalKinds: ['rupture', 'pressure', 'service-impact'],
          showRupture: true,
          zoneLabel: 'Критическая зона аварии и мгновенное влияние на подключённые объекты',
        },
      },
      {
        id: 't-plus-15m',
        offsetMinutes: 15,
        relativeTimeLabel: 'T+15м',
        phase: 'after',
        category: 'развитие последствий',
        title: 'Нарушение режима начинает затрагивать подключенные объекты',
        description:
          'Продолжается потеря теплоносителя, растет зона влияния по гидравлическому режиму, падает качество теплоснабжения у части потребителей.',
        recommendations: [
          'Проверить объекты с первыми отклонениями по параметрам.',
          'Подготовить информирование по ухудшению режима.',
        ],
        consequences: [
          'Увеличится масштаб воздействия.',
          'Ухудшатся параметры у подключённых зданий.',
        ],
        status: 'forecast-low',
        isMilestone: true,
        keySignals: ['Потеря теплоносителя', 'Первые просадки параметров на зданиях'],
        affectedObjectIds: ['house-1', 'house-2', 'kindergarten-1'],
        visualState: {
          pipeSeverity: 'critical',
          highlightedObjectIds: ['house-1', 'house-2', 'kindergarten-1'],
          impactRadius: 186,
          impactOpacity: 0.26,
          signalKinds: ['rupture', 'service-impact'],
          showRupture: true,
          zoneLabel: 'Последствия начинают проявляться в потребительском контуре',
        },
      },
      {
        id: 't-plus-30m',
        offsetMinutes: 30,
        relativeTimeLabel: 'T+30м',
        phase: 'after',
        category: 'развитие последствий',
        title: 'Авария выходит в городской эксплуатационный контур',
        description:
          'Увеличивается число потребителей с отклонением по параметрам, возрастает риск жалоб, возможно ограничение движения и необходимость ограждения зоны.',
        recommendations: [
          'Подготовить ограждение и дорожное сопровождение.',
          'Оценить перевод части потока на аварийные схемы.',
        ],
        consequences: [
          'Инцидент выходит за рамки технологического события.',
          'Затрагивается уличная инфраструктура.',
        ],
        status: 'forecast-medium',
        isMilestone: true,
        keySignals: ['Рост числа потребителей с отклонением', 'Вероятность ограничений вокруг участка'],
        affectedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1'],
        visualState: {
          pipeSeverity: 'critical',
          highlightedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1'],
          impactRadius: 214,
          impactOpacity: 0.29,
          signalKinds: ['rupture', 'service-impact', 'pressure'],
          showRupture: true,
          zoneLabel: 'Технологический инцидент перерастает в городской эксплуатационный контур',
        },
      },
      {
        id: 't-plus-1h',
        offsetMinutes: 60,
        relativeTimeLabel: 'T+1ч',
        phase: 'after',
        category: 'развитие последствий',
        title: 'Стоимость и масштаб реагирования выросли',
        description:
          'Часть зданий может перейти на критически сниженные параметры, растут потери ресурса, окно для малого вмешательства закрывается.',
        recommendations: [
          'Переключиться с локального режима на аварийный сценарий.',
          'Подтвердить готовность ремонтной бригады и техники.',
        ],
        consequences: [
          'Потребуется уже аварийный, а не локальный сценарий реагирования.',
        ],
        status: 'forecast-high',
        isMilestone: true,
        keySignals: ['Критически сниженные параметры на части зданий', 'Рост потерь ресурса'],
        affectedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
        visualState: {
          pipeSeverity: 'critical',
          highlightedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
          impactRadius: 248,
          impactOpacity: 0.32,
          signalKinds: ['rupture', 'service-impact', 'flow'],
          showRupture: true,
          zoneLabel: 'Локальное окно вмешательства закрыто, нужен аварийный сценарий',
        },
      },
      {
        id: 't-plus-2h',
        offsetMinutes: 120,
        relativeTimeLabel: 'T+2ч',
        phase: 'after',
        category: 'развитие последствий',
        title: 'Инцидент стал межфункциональным',
        description:
          'Высок риск существенного ухудшения теплоснабжения в зоне, расширения отключений на время ремонта, вторичных последствий для городской инфраструктуры и управленческой эскалации.',
        recommendations: [
          'Подключить межфункциональный штаб реагирования.',
          'Готовить расширенное информирование и контур поручений.',
        ],
        consequences: [
          'Последствия становятся масштабными и затрагивают несколько контуров управления.',
        ],
        status: 'forecast-critical',
        isMilestone: true,
        keySignals: ['Расширение отключений', 'Вторичные последствия для инфраструктуры', 'Управленческая эскалация'],
        affectedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
        visualState: {
          pipeSeverity: 'critical',
          highlightedObjectIds: ['house-1', 'house-2', 'house-3', 'kindergarten-1', 'admin-1'],
          impactRadius: 284,
          impactOpacity: 0.36,
          signalKinds: ['rupture', 'service-impact', 'pressure', 'flow'],
          showRupture: true,
          zoneLabel: 'Последствия затрагивают несколько управленческих контуров',
        },
      },
    ],
  }
}
