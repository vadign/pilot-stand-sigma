/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react'
import { defaultTransportStops } from '../public-transport/data/defaultTransportData'
import { selectTransportFilterOptions } from '../public-transport/selectors'
import { getDistrictName } from '../../lib/districts'
import { useSigmaStore } from '../../store/useSigmaStore'
import {
  selectOutageSummary,
  selectSourceStatuses,
  useDistrictOutageCards,
  useIncidentViews,
} from '../../live/selectors'
import type { LiveIncidentView, OutageKind } from '../../live/types'

const paleRedBadgeStyle = 'border-red-200 bg-red-100 text-red-700'

export const severityStyles: Record<string, string> = {
  критический: paleRedBadgeStyle,
  высокий: 'border-amber-200 bg-amber-50 text-amber-700',
  средний: 'border-sky-200 bg-sky-50 text-sky-700',
  низкий: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const sourceTypeLabels: Record<string, string> = {
  real: 'real',
  calculated: 'calculated',
  simulation: 'simulation',
  pilot: 'mock',
  'mock-fallback': 'mock-fallback',
}

export const sourceModeLabels: Record<string, string> = {
  live: 'прямой',
  hybrid: 'гибридный',
  mock: 'mock',
}

export const utilityLabels: Record<string, string> = {
  heating: 'отопление',
  hot_water: 'горячая вода',
  cold_water: 'холодная вода',
  sewer: 'водоотведение',
  electricity: 'электроснабжение',
  gas: 'газоснабжение',
}

export const outageKindBadgeStyles: Record<OutageKind, string> = {
  emergency: paleRedBadgeStyle,
  planned: 'border-amber-200 bg-amber-50 text-amber-700',
}

export const getOutageKindBadgeStyle = (kind?: OutageKind): string =>
  outageKindBadgeStyles[kind ?? 'planned']

export const subsystemTabs = [
  { id: 'heat', title: 'Энергетика' },
  { id: 'transport', title: 'Общественный транспорт' },
  { id: 'education', title: 'Школы и детские сады' },
  { id: 'roads', title: 'Дороги' },
  { id: 'noise', title: 'Шум' },
  { id: 'air', title: 'Воздух' },
] as const

export const operationalSubsystemTabs = subsystemTabs.filter((tab) => tab.id !== 'transport' && tab.id !== 'education')

export type SubsystemTabId = (typeof subsystemTabs)[number]['id']

export const subsystemTabDescriptions: Record<SubsystemTabId, { title: string; description: string }> = {
  heat: {
    title: 'ЖКХ и энергетика под управлением оперативных источников',
    description: 'Оперативная картина по отключениям, авариям и состоянию городской энергетической инфраструктуры.',
  },
  roads: {
    title: 'Дорожный контур и транспортная обстановка',
    description: 'Вкладка возвращает оперативный слой по дорожным инцидентам, узлам движения и зонам транспортного риска.',
  },
  noise: {
    title: 'Шумовой контур и городская безопасность',
    description: 'Здесь собраны точки превышения шумового фона, ночные нарушения и события, требующие патрулирования.',
  },
  air: {
    title: 'Экология и качество воздуха',
    description: 'Вкладка показывает контур качества воздуха, сигналы постов наблюдения и экологические риски по районам.',
  },
  transport: {
    title: 'Общественный транспорт в управленческом контуре мэра',
    description: 'Карта, маршруты, тарифы и связность районов в одном представлении для управленческого обзора.',
  },
  education: {
    title: 'Школы и детские сады в городском контуре социальной инфраструктуры',
    description: 'Реальные учреждения Новосибирска по официальным CSV: адреса, районная статистика и примерные зоны покрытия.',
  },
}

const severityPriority: Record<string, number> = {
  критический: 0,
  высокий: 1,
  средний: 2,
  низкий: 3,
}

export const transportQueryParamKeys = [
  'district',
  'mode',
  'search',
  'route',
  'pavilion',
  'pavilionOnly',
  'compareTo',
  'fromDistrict',
  'toDistrict',
  'focus',
  'map',
] as const

export const transportDistrictOptions = selectTransportFilterOptions(defaultTransportStops).districts

export const isHeatSubsystemTab = (tab: SubsystemTabId): boolean => tab === 'heat'
export const isTransportSubsystemTab = (tab: SubsystemTabId): boolean => tab === 'transport'
export const isEducationSubsystemTab = (tab: SubsystemTabId): boolean => tab === 'education'

export const matchesSubsystemTab = (incident: LiveIncidentView, tab: SubsystemTabId): boolean => {
  if (tab === 'heat') {
    return incident.sourceKind === 'live' || incident.subsystem === 'heat' || incident.subsystem === 'utilities'
  }
  if (tab === 'transport') return false
  if (tab === 'education') return false
  return incident.subsystem === tab
}

const isSubsystemTabId = (value: string | null): value is SubsystemTabId =>
  subsystemTabs.some((tab) => tab.id === value)

export const readSubsystemFromParams = (params: URLSearchParams): SubsystemTabId => {
  const value = params.get('subsystem')
  return isSubsystemTabId(value) ? value : 'heat'
}

export const sortIncidentsByPriority = (incidents: LiveIncidentView[]): LiveIncidentView[] =>
  [...incidents].sort((left, right) => {
    const severityDelta = (severityPriority[left.severity] ?? 99) - (severityPriority[right.severity] ?? 99)
    if (severityDelta !== 0) return severityDelta
    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
  })

export const buildIncidentDistrictCards = (incidents: LiveIncidentView[]) => {
  const districtMap = new Map<string, { districtName: string; incidents: number; affectedPopulation: number }>()

  for (const incident of incidents) {
    const current = districtMap.get(incident.district) ?? {
      districtName: getDistrictName(incident.district),
      incidents: 0,
      affectedPopulation: 0,
    }

    current.incidents += 1
    current.affectedPopulation += incident.affectedPopulation
    districtMap.set(incident.district, current)
  }

  return Array.from(districtMap.values()).sort((left, right) => {
    if (right.incidents !== left.incidents) return right.incidents - left.incidents
    return right.affectedPopulation - left.affectedPopulation
  })
}

export const buildStatusCards = (incidents: LiveIncidentView[]) => {
  const statusMap = new Map<string, number>()
  for (const incident of incidents) {
    statusMap.set(incident.status, (statusMap.get(incident.status) ?? 0) + 1)
  }

  return Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count)
}

export const SubsystemTabs = ({
  value,
  onChange,
  tabs = subsystemTabs,
}: {
  value: SubsystemTabId
  onChange: (tab: SubsystemTabId) => void
  tabs?: readonly { id: SubsystemTabId; title: string }[]
}) => (
  <div className="flex flex-wrap gap-2">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
          value === tab.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {tab.title}
      </button>
    ))}
  </div>
)

export const formatDelta = (value?: number) => value === undefined ? '—' : `${value > 0 ? '+' : ''}${value}`

export const useDashboardData = () => {
  const districts = useSigmaStore((state) => state.districts)
  const incidents = useIncidentViews()
  const outageSummary = useSigmaStore(selectOutageSummary)
  const sourceStatuses = useSigmaStore(selectSourceStatuses)
  const districtCards = useDistrictOutageCards()
  const live = useSigmaStore((state) => state.live)

  return useMemo(
    () => ({ districts, incidents, outageSummary, sourceStatuses, districtCards, live }),
    [districtCards, districts, incidents, live, outageSummary, sourceStatuses],
  )
}
