/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Download, Play, Shield, Siren } from 'lucide-react'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { MapView } from '../components/MapView'
import { Badge, Card, MetaGrid, SectionTitle, SourceMetaFooter } from '../components/ui'
import { getDistrictName } from '../lib/districts'
import { useSigmaStore } from '../store/useSigmaStore'
import {
  selectIncidentById,
  selectOutageSummary,
  selectSourceStatuses,
  useConstructionAggregates,
  useConstructionObjects,
  useDistrictOutageCards,
  useIncidentViews,
  useIndicators,
  useOutageHistorySeries,
  useReferenceObjects,
  useRiskCards,
  useTrafficIndex,
} from '../live/selectors'
import type { LiveIncidentView } from '../live/types'

const severityStyles: Record<string, string> = {
  критический: 'border-red-200 bg-red-50 text-red-700',
  высокий: 'border-amber-200 bg-amber-50 text-amber-700',
  средний: 'border-sky-200 bg-sky-50 text-sky-700',
  низкий: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const sourceTypeLabels: Record<string, string> = {
  real: 'real',
  calculated: 'calculated',
  simulation: 'simulation',
  reference: 'reference',
  pilot: 'mock',
  'mock-fallback': 'mock-fallback',
}

const utilityLabels: Record<string, string> = {
  heating: 'отопление',
  hot_water: 'горячая вода',
  cold_water: 'холодная вода',
  sewer: 'водоотведение',
  electricity: 'электроснабжение',
  gas: 'газоснабжение',
}

const subsystemTabs = [
  { id: 'heat', title: 'Теплоснабжение' },
  { id: 'roads', title: 'Дороги' },
  { id: 'noise', title: 'Шум' },
  { id: 'air', title: 'Воздух' },
] as const

type SubsystemTabId = (typeof subsystemTabs)[number]['id']

const subsystemTabDescriptions: Record<SubsystemTabId, { title: string; description: string }> = {
  heat: {
    title: 'ЖКХ и теплоснабжение под управлением live-источников',
    description: 'KPI по отключениям строятся на основе официальной страницы 051, а строительная аналитика — на официальных CSV из open data.',
  },
  roads: {
    title: 'Транспорт, дорожная нагрузка и камеры ПДД',
    description: 'На вкладке объединены дорожные инциденты, calculated traffic index и reference layers камер и остановок.',
  },
  noise: {
    title: 'Городская безопасность и шум',
    description: 'Остается существующий операционный контур, но карта теперь умеет включать дополнительные reference layers.',
  },
  air: {
    title: 'Экология и погодные риски',
    description: 'Open-Meteo используется для фактов по воздуху и погоде, а Sigma rules — для explainable risk cards.',
  },
}

const isHeatSubsystemTab = (tab: SubsystemTabId): boolean => tab === 'heat'

const matchesSubsystemTab = (incident: LiveIncidentView, tab: SubsystemTabId): boolean => {
  if (tab === 'heat') return incident.sourceKind === 'live' || incident.subsystem === 'heat' || incident.subsystem === 'utilities'
  return incident.subsystem === tab
}

const sortIncidentsByPriority = (incidents: LiveIncidentView[]): LiveIncidentView[] =>
  [...incidents].sort((left, right) => {
    const severityPriority: Record<string, number> = { критический: 0, высокий: 1, средний: 2, низкий: 3 }
    const severityDelta = (severityPriority[left.severity] ?? 99) - (severityPriority[right.severity] ?? 99)
    if (severityDelta !== 0) return severityDelta
    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
  })

const SubsystemTabs = ({ value, onChange }: { value: SubsystemTabId; onChange: (tab: SubsystemTabId) => void }) => (
  <div className="flex flex-wrap gap-2">
    {subsystemTabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${value === tab.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
      >
        {tab.title}
      </button>
    ))}
  </div>
)

const useDashboardData = () => {
  const districts = useSigmaStore((state) => state.districts)
  const incidents = useIncidentViews()
  const outageSummary = useSigmaStore(selectOutageSummary)
  const sourceStatuses = useSigmaStore(selectSourceStatuses)
  const construction = useConstructionAggregates()
  const districtCards = useDistrictOutageCards()
  const live = useSigmaStore((state) => state.live)
  const indicators = useIndicators()
  const riskCards = useRiskCards()
  const trafficIndex = useTrafficIndex()
  const referenceObjects = useReferenceObjects()
  const constructionObjects = useConstructionObjects()
  return { districts, incidents, outageSummary, sourceStatuses, construction, districtCards, live, indicators, riskCards, trafficIndex, referenceObjects, constructionObjects }
}

const DataSourcePanel = () => {
  const statuses = useSigmaStore(selectSourceStatuses)
  if (statuses.length === 0) return null
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">Источники данных</div>
          <div className="text-2xl font-bold">Состояние ingestion слоя</div>
        </div>
        <Badge text="runtime → snapshot → cache → mock" className="bg-slate-100 text-slate-700" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {statuses.slice(0, 8).map((status) => (
          <div key={status.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{status.name}</div>
              <Badge text={`${status.origin}/${status.status}`} className={status.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : status.status === 'stale' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'} />
              <Badge text={status.dataCategory} className="bg-slate-100 text-slate-700" />
            </div>
            <div className="mt-2 text-sm text-slate-600">{status.message}</div>
            <SourceMetaFooter source={status.sourceUrls[0] ?? '—'} updatedAt={status.lastUpdated} ttl={`${Math.round(status.ttlMs / 60000)} мин`} type={sourceTypeLabels[status.dataCategory] ?? status.dataCategory} status={status.status} />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function BriefingPage() {
  const navigate = useNavigate()
  const { incidents, outageSummary, construction, sourceStatuses, indicators, riskCards, trafficIndex, referenceObjects } = useDashboardData()
  const liveStatus051 = sourceStatuses.find((item) => item.id === 'source-051')
  const liveStatusOpenData = sourceStatuses.find((item) => item.id === 'source-opendata-construction-permits')
  const emergencyLive = incidents.filter((incident) => incident.sourceKind === 'live' && incident.liveMeta?.outageKind === 'emergency')
  const plannedLive = incidents.filter((incident) => incident.sourceKind === 'live' && incident.liveMeta?.outageKind === 'planned')
  const topConstruction = construction.slice(0, 5)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Sigma Управленческий бриф</div>
            <h1 className="text-4xl font-extrabold">Ежедневный управленческий бриф: {new Date().toLocaleDateString('ru-RU')}</h1>
            <p className="mt-2 text-lg text-slate-500">ЖКХ, экология, транспорт, стройки и прозрачность источников в одном брифе.</p>
          </div>
          <button onClick={() => window.print()} className="rounded-xl border px-3 py-2 font-semibold"><Download size={14} className="mr-1 inline" />Экспорт PDF</button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Аварийные отключения 051</div><div className="mt-2 text-5xl font-bold text-red-600">{emergencyLive.length}</div><div className="text-slate-500">домов: {outageSummary?.emergencyHouses ?? 0}</div></Card>
        <Card><div className="text-sm text-slate-500">Экологические риски</div><div className="mt-2 text-5xl font-bold text-emerald-600">{riskCards.length}</div><div className="text-slate-500">AQI {indicators.find((item) => item.metric === 'aqi')?.value ?? '—'} · PM2.5 {indicators.find((item) => item.metric === 'pm25')?.value ?? '—'}</div></Card>
        <Card><div className="text-sm text-slate-500">Traffic index</div><div className="mt-2 text-5xl font-bold text-blue-700">{trafficIndex[0]?.score ?? '—'}</div><div className="text-slate-500">calculated, не live navigation</div></Card>
        <Card><div className="text-sm text-slate-500">Активные стройки</div><div className="mt-2 text-5xl font-bold text-emerald-600">{construction.reduce((sum, item) => sum + item.activeConstruction, 0)}</div><div className="text-slate-500">по open data 124/125</div></Card>
      </div>

      <Card>
        <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Сводка системы</div>
        <p className="mt-2 text-xl leading-relaxed text-slate-700 lg:text-3xl">
          По данным 051 сейчас зарегистрировано <b className="text-blue-700">{outageSummary?.activeIncidents ?? 0} live-событий</b>, аварийных домов — <b>{outageSummary?.emergencyHouses ?? 0}</b>,
          дорожный индекс отмечен как <b>calculated</b>, а reference layers включают <b>{referenceObjects.length}</b> объектов городской инфраструктуры.
        </p>
        {liveStatus051 && <SourceMetaFooter source={liveStatus051.sourceUrls[0] ?? '—'} updatedAt={liveStatus051.lastUpdated} ttl={`${Math.round(liveStatus051.ttlMs / 60000)} мин`} type={sourceTypeLabels[liveStatus051.dataCategory] ?? liveStatus051.dataCategory} status={liveStatus051.status} />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-3 text-2xl font-bold">Активные live-события ЖКХ</div>
          {incidents.filter((incident) => incident.sourceKind === 'live').slice(0, 5).map((incident) => (
            <button key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)} className="mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left hover:bg-slate-50">
              <div>
                <div className="font-semibold">{incident.title}</div>
                <div className="text-sm text-slate-500">{incident.summary}</div>
              </div>
              <div className="text-right text-sm text-slate-500">{new Date(incident.detectedAt).toLocaleTimeString('ru-RU')}</div>
            </button>
          ))}
        </Card>
        <Card className="lg:col-span-5">
          <div className="mb-3 text-2xl font-bold">Строительная активность по районам</div>
          <div className="space-y-2">
            {topConstruction.map((item) => (
              <div key={item.districtName} className="rounded-xl border p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">{item.districtName}</span><span className="text-sm text-slate-500">active {item.activeConstruction}</span></div>
                <div className="mt-2 text-sm text-slate-600">Разрешения: {item.permits} · Ввод: {item.commissioned}</div>
              </div>
            ))}
          </div>
          {liveStatusOpenData && <SourceMetaFooter source={liveStatusOpenData.sourceUrls[0] ?? '—'} updatedAt={liveStatusOpenData.lastUpdated} ttl={`${Math.round(liveStatusOpenData.ttlMs / 60000)} мин`} type={sourceTypeLabels[liveStatusOpenData.dataCategory] ?? liveStatusOpenData.dataCategory} status={liveStatusOpenData.status} />}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">AQI</div><div className="mt-2 text-4xl font-bold">{indicators.find((item) => item.metric === 'aqi')?.value ?? '—'}</div><div className="text-slate-500">Open-Meteo air</div></Card>
        <Card><div className="text-sm text-slate-500">Traffic index</div><div className="mt-2 text-4xl font-bold">{trafficIndex[0]?.score ?? '—'}</div><div className="text-slate-500">calculated</div></Card>
        <Card><div className="text-sm text-slate-500">Плановые отключения</div><div className="mt-2 text-4xl font-bold">{plannedLive.length}</div><div className="text-slate-500">по 051</div></Card>
        <Card><div className="text-sm text-slate-500">Источники в контуре</div><div className="mt-2 text-4xl font-bold">{sourceStatuses.length}</div><div className="text-slate-500">с freshness и типом данных</div></Card>
      </div>

      <DataSourcePanel />
    </div>
  )
}

export function MayorDashboardPage() {
  const { districts, incidents, outageSummary, districtCards, sourceStatuses, indicators, riskCards, trafficIndex, referenceObjects, live } = useDashboardData()
  const [district, setDistrict] = useState('')
  const [subsystem, setSubsystem] = useState<SubsystemTabId>('heat')
  const subsystemIncidents = incidents.filter((incident) => matchesSubsystemTab(incident, subsystem))
  const visibleIncidents = subsystemIncidents.filter((incident) => !district || incident.district === district)
  const liveIncidents = visibleIncidents.filter((incident) => incident.sourceKind === 'live')
  const urgent = liveIncidents.filter((incident) => incident.liveMeta?.outageKind === 'emergency')
  const prioritizedIncidents = sortIncidentsByPriority(visibleIncidents)
  const criticalIncidents = visibleIncidents.filter((incident) => incident.severity === 'критический').length
  const selectedSubsystemMeta = subsystemTabDescriptions[subsystem]
  const isHeatTab = isHeatSubsystemTab(subsystem)
  const status051 = sourceStatuses.find((item) => item.id === 'source-051')

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3">
          <SubsystemTabs value={subsystem} onChange={setSubsystem} />
          <div className="flex flex-wrap gap-2">
            <select className="rounded-xl border px-3 py-2" value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="">Все районы</option>
              {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Badge text={subsystemTabs.find((item) => item.id === subsystem)?.title ?? 'Контур'} className="bg-slate-900 text-white" />
            <Badge text="real + reference + calculated" className="bg-slate-100 text-slate-700" />
          </div>
        </div>
        {status051 && <SourceMetaFooter source={status051.sourceUrls[0] ?? '—'} updatedAt={status051.lastUpdated} ttl={`${Math.round(status051.ttlMs / 60000)} мин`} type={sourceTypeLabels[status051.dataCategory] ?? status051.dataCategory} status={status051.status} />}
      </Card>

      <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <Badge text="гибридный контур управления" className="mb-3 border-emerald-300 bg-emerald-500/20 text-emerald-100" />
        <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">{selectedSubsystemMeta.title}</h2>
        <p className="mt-3 max-w-4xl text-lg text-blue-100">{selectedSubsystemMeta.description}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isHeatTab ? (
          <>
            <Card><div className="text-sm text-slate-500">Активные отключения</div><div className="mt-2 text-5xl font-bold">{outageSummary?.activeIncidents ?? 0}</div><div className="mt-2 text-sm text-slate-500">аварийных: {urgent.length}</div></Card>
            <Card><div className="text-sm text-slate-500">Отключено домов</div><div className="mt-2 text-5xl font-bold">{outageSummary?.totalHouses ?? 0}</div><div className="mt-2 text-sm text-slate-500">planned/emergency отдельно</div></Card>
            <Card><div className="text-sm text-slate-500">Экологические риски</div><div className="mt-2 text-5xl font-bold text-emerald-600">{riskCards.length}</div><div className="mt-2 text-sm text-slate-500">AQI {indicators.find((item) => item.metric === 'aqi')?.value ?? '—'}</div></Card>
            <Card><div className="text-sm text-slate-500">Активные стройки</div><div className="mt-2 text-5xl font-bold text-emerald-600">{live.constructionObjects.filter((item) => item.status === 'active').length}</div><div className="mt-2 text-sm text-slate-500">контур градконтроля</div></Card>
          </>
        ) : (
          <>
            <Card><div className="text-sm text-slate-500">Активные события</div><div className="mt-2 text-5xl font-bold">{visibleIncidents.length}</div><div className="mt-2 text-sm text-slate-500">в выбранном контуре</div></Card>
            <Card><div className="text-sm text-slate-500">Критические</div><div className="mt-2 text-5xl font-bold text-red-600">{criticalIncidents}</div><div className="mt-2 text-sm text-slate-500">требуют приоритетного внимания</div></Card>
            <Card><div className="text-sm text-slate-500">Traffic index</div><div className="mt-2 text-5xl font-bold text-blue-700">{trafficIndex[0]?.score ?? '—'}</div><div className="mt-2 text-sm text-slate-500">calculated</div></Card>
            <Card><div className="text-sm text-slate-500">Reference layers</div><div className="mt-2 text-5xl font-bold text-emerald-600">{referenceObjects.length}</div><div className="mt-2 text-sm text-slate-500">камеры, медицина, социнфраструктура</div></Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8"><Card><div className="mb-3 text-3xl font-bold">Карта территориальных проблем</div><MapView incidents={visibleIncidents.slice(0, 20)} referenceObjects={referenceObjects.slice(0, 12)} boundaries={live.districtBoundaries} /></Card></div>
        <div className="space-y-3 lg:col-span-4">
          <Card>
            <div className="mb-2 text-2xl font-bold">Приоритетные сигналы</div>
            {(isHeatTab ? urgent : prioritizedIncidents).slice(0, 4).map((incident) => (
              <div key={incident.id} className="mb-2 rounded-xl border bg-blue-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge text={incident.severity} className="bg-red-50 text-red-700" />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{getDistrictName(incident.district)}</span>
                </div>
                <div className="mt-2 font-bold">{incident.title}</div>
                <div className="text-sm text-slate-500">{incident.summary}</div>
              </div>
            ))}
          </Card>
          <Card>
            <div className="mb-2 text-2xl font-bold">Топ-районы по текущим проблемам</div>
            {districtCards.slice(0, 5).map((item) => (
              <div key={item.districtName} className="mb-2 rounded-xl border p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">{item.districtName}</span><span className="text-sm text-slate-500">{item.houses} домов</span></div>
                <div className="mt-1 text-sm text-slate-500">Инцидентов: {item.incidents}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <DataSourcePanel />
    </div>
  )
}

export function OperationsPage() {
  const incidents = useIncidentViews()
  const referenceObjects = useReferenceObjects()
  const riskCards = useRiskCards()
  const trafficIndex = useTrafficIndex()
  const boundaries = useSigmaStore((state) => state.live.districtBoundaries)
  const assignIncident = useSigmaStore((state) => state.assignIncident)
  const escalateIncident = useSigmaStore((state) => state.escalateIncident)
  const archiveIncident = useSigmaStore((state) => state.archiveIncident)
  const takeLiveIncident = useSigmaStore((state) => state.takeLiveIncident)
  const setSelectedIncident = useSigmaStore((state) => state.setSelectedIncident)
  const [searchParams] = useSearchParams()
  const [subsystem, setSubsystem] = useState<SubsystemTabId>('heat')
  const [severity, setSeverity] = useState(searchParams.get('severity') ?? '')
  const [source, setSource] = useState(searchParams.get('source') ?? 'all')
  const [utility, setUtility] = useState('')
  const [outageKind, setOutageKind] = useState('')
  const [layers, setLayers] = useState<string[]>(['cameras', 'medical', 'stops', 'districts'])
  const district = searchParams.get('district') ?? ''
  const isHeatTab = isHeatSubsystemTab(subsystem)

  const filtered = incidents.filter((incident) =>
    matchesSubsystemTab(incident, subsystem)
    && (!severity || incident.severity === severity)
    && (!district || incident.district === district)
    && (source === 'all' || incident.sourceKind === source)
    && (!isHeatTab || !utility || incident.liveMeta?.utilityType === utility)
    && (!isHeatTab || !outageKind || incident.liveMeta?.outageKind === outageKind),
  )

  const mapReferences = referenceObjects.filter((item) =>
    (layers.includes('cameras') && item.category === 'camera')
    || (layers.includes('medical') && item.category === 'medical')
    || (layers.includes('stops') && item.category === 'stop'),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        <Card>
          <div className="mb-3 text-3xl font-bold">Оперативный монитор</div>
          <div className="mb-3"><SubsystemTabs value={subsystem} onChange={setSubsystem} /></div>
          <div className="grid gap-2">
            <select className="rounded-xl border px-3 py-2" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="">Критичность: все</option><option value="критический">Критический</option><option value="высокий">Высокий</option><option value="средний">Средний</option>
            </select>
            <select className="rounded-xl border px-3 py-2" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">Источник: все</option><option value="live">live</option><option value="mock">mock</option>
            </select>
            {isHeatTab && (
              <>
                <select className="rounded-xl border px-3 py-2" value={outageKind} onChange={(event) => setOutageKind(event.target.value)}>
                  <option value="">Тип отключения: все</option><option value="emergency">Аварийные</option><option value="planned">Плановые</option>
                </select>
                <select className="rounded-xl border px-3 py-2" value={utility} onChange={(event) => setUtility(event.target.value)}>
                  <option value="">Ресурс: все</option>
                  {Object.entries(utilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </>
            )}
            <div className="rounded-xl border p-3 text-sm">
              <div className="mb-2 font-semibold">Слои карты</div>
              {['cameras', 'medical', 'stops', 'districts'].map((layer) => (
                <label key={layer} className="flex items-center gap-2"><input type="checkbox" checked={layers.includes(layer)} onChange={() => setLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer])} />{layer}</label>
              ))}
            </div>
          </div>
        </Card>

        {filtered.slice(0, 8).map((incident) => (
          <Card key={incident.id} className={`border-l-4 ${incident.severity === 'критический' ? 'border-l-red-500' : incident.severity === 'высокий' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><Badge text={`${incident.sourceBadge.toUpperCase()} · ${incident.severity.toUpperCase()}`} className={severityStyles[incident.severity]} /><span className="text-xs text-slate-500">{new Date(incident.detectedAt).toLocaleTimeString('ru-RU')}</span></div>
            <div className="text-2xl font-bold">{incident.title}</div>
            <div className="mt-1 text-slate-500">{incident.summary}</div>
            {incident.liveMeta && <div className="mt-2 text-sm text-slate-500">{utilityLabels[incident.liveMeta.utilityType]} · {incident.liveMeta.outageKind === 'emergency' ? 'аварийное' : 'плановое'} · уровень детализации: район</div>}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => assignIncident(incident.id, 'Штаб района')} className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white">Назначить</button>
              <button onClick={() => escalateIncident(incident.id)} className="rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white">Эскалировать</button>
              {incident.sourceKind === 'live' ? <button onClick={() => takeLiveIncident(incident.id, 'Штаб ЖКХ')} className="rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white">Взять в работу</button> : <button onClick={() => archiveIncident(incident.id)} className="rounded-lg bg-slate-200 py-2 text-xs font-semibold">Архив</button>}
            </div>
          </Card>
        ))}

        <button onClick={() => alert('Экстренный протокол запущен')} className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold text-white"><Siren size={18} className="mr-1 inline" />Экстренный протокол</button>
      </div>

      <div className="col-span-8">
        <Card className="relative">
          <MapView incidents={filtered} referenceObjects={mapReferences} boundaries={layers.includes('districts') ? boundaries : []} onPick={setSelectedIncident} />
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-red-200 bg-white p-3 shadow lg:bottom-5 lg:left-auto lg:right-5">
            <div className="font-bold text-red-600"><AlertTriangle size={16} className="mr-1 inline" />Контур с новыми слоями активен</div>
            <div className="text-sm text-slate-600">Traffic index: {trafficIndex[0]?.score ?? '—'} · eco risks: {riskCards.length}. Камеры и медучреждения отображаются как reference layer, не как fake incidents.</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function IncidentPage() {
  const { id = '' } = useParams()
  const incident = useSigmaStore((state) => selectIncidentById(state, id))
  const regulations = useSigmaStore((state) => state.regulations)
  const escalateIncident = useSigmaStore((state) => state.escalateIncident)
  const resolveIncident = useSigmaStore((state) => state.resolveIncident)
  const addTimeline = useSigmaStore((state) => state.addTimeline)
  const toggleRecommendationStep = useSigmaStore((state) => state.toggleRecommendationStep)
  const referenceObjects = useReferenceObjects()
  const riskCards = useRiskCards()
  const constructionObjects = useConstructionObjects()
  const [manualNote, setManualNote] = useState('')

  if (!incident) return <Card>Инцидент не найден</Card>

  const linkedRegulations = regulations.filter((regulation) => incident.linkedRegulationIds.includes(regulation.id))
  const nearbyMedical = referenceObjects.filter((item) => item.category === 'medical' && item.districtId === incident.district).slice(0, 3)
  const nearbyCameras = referenceObjects.filter((item) => item.category === 'camera' && item.districtId === incident.district).slice(0, 3)
  const nearbyConstruction = constructionObjects.filter((item) => item.districtId === incident.district && item.status === 'active').slice(0, 3)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold lg:text-5xl">{incident.title}</h1>
            <div className="mt-2 text-slate-500">ID: {incident.id} · Обнаружен: {new Date(incident.detectedAt).toLocaleTimeString('ru-RU')} · Зона: {getDistrictName(incident.district)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge text={`${incident.sourceBadge} · ${sourceTypeLabels[incident.dataType] ?? incident.dataType}`} className="bg-blue-50 text-blue-700" />
            <button onClick={() => escalateIncident(incident.id)} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold">Эскалировать</button>
            {incident.canResolve && <button onClick={() => resolveIncident(incident.id)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Разрешить инцидент</button>}
          </div>
        </div>
        <SourceMetaFooter source={incident.sourceKind === 'live' ? '051.novo-sibirsk.ru' : 'Sigma mock-store'} updatedAt={incident.sourceUpdatedAt} ttl={incident.sourceKind === 'live' ? '30 мин' : 'n/a'} type={sourceTypeLabels[incident.dataType] ?? incident.dataType} status={incident.sourceKind === 'live' ? 'ready' : 'mock'} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Источник</div><div className="text-2xl font-bold">{incident.sourceKind === 'live' ? '051 / live snapshot' : 'Mock store'}</div></Card>
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Уровень детализации</div><div className="text-2xl font-bold">{incident.liveMeta ? 'район' : 'точка'}</div></Card>
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Ресурс</div><div className="text-2xl font-bold">{incident.liveMeta ? utilityLabels[incident.liveMeta.utilityType] : 'операционный инцидент'}</div></Card>
          </div>

          <Card>
            <div className="mb-3 text-3xl font-bold">Анализ критичности</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="rounded-xl border p-3"><b>Влияние на жителей:</b> около {incident.affectedPopulation}+ человек.</div>
                <div className="rounded-xl border p-3"><b>Источник данных:</b> {incident.sourceKind === 'live' ? 'официальный live-источник 051' : 'демо-модель Sigma'}.</div>
                <div className="rounded-xl border p-3"><b>Комментарий:</b> {incident.statusHint ?? 'локальный workflow Sigma'}</div>
              </div>
              <MapView incidents={[incident]} referenceObjects={[...nearbyMedical, ...nearbyCameras]} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-3xl font-bold">Рекомендации Sigma Logic</div>
            {incident.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="space-y-2">
                {recommendation.steps.map((step, index) => (
                  <label key={step.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${step.done ? 'border-emerald-200 bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div><div className="text-lg">{step.title}</div></div>
                    <input type="checkbox" checked={step.done} onChange={() => toggleRecommendationStep(incident.id, recommendation.id, step.id)} disabled={incident.sourceKind === 'live'} />
                  </label>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="bg-blue-50">
            <div className="mb-2 flex items-center gap-2 text-2xl font-bold text-blue-700"><Shield size={18} />Цифровые регламенты</div>
            {linkedRegulations.map((regulation) => <div key={regulation.id} className="mb-2 rounded-xl border bg-white p-3"><div className="font-semibold">{regulation.code} · {regulation.title}</div><div className="text-sm text-slate-500">{regulation.sourceDocument}, {regulation.sourceClause}</div></div>)}
          </Card>

          <Card>
            <div className="mb-2 text-xl font-bold">Контекст рядом с инцидентом</div>
            <div className="space-y-2 text-sm">
              <div>Медучреждения рядом: {nearbyMedical.map((item) => item.title).join(', ') || 'нет'}</div>
              <div>Камеры рядом: {nearbyCameras.map((item) => item.title).join(', ') || 'нет'}</div>
              <div>Активные стройки: {nearbyConstruction.map((item) => item.title).join(', ') || 'нет'}</div>
              {riskCards[0] && <div>Экологическое правило: {riskCards[0].title} — {riskCards[0].explanation.because.join(', ')}</div>}
            </div>
          </Card>

          <Card>
            <div className="text-xl font-bold">Ответственные лица</div>
            <div className="mt-2 font-semibold">{incident.assignee}</div>
            <div className="mt-3 text-sm">Прогресс устранения <b className="float-right">{incident.progress}%</b></div>
            <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${incident.progress}%` }} /></div>
            <div className="mt-3 text-sm text-slate-500">Срок (дедлайн): {new Date(incident.deadline).toLocaleString('ru-RU')}</div>
          </Card>

          <Card>
            <div className="mb-2 text-xl font-bold">Журнал решений</div>
            {incident.timeline.map((item) => <div key={item.id} className="mb-2 text-sm"><b>{new Date(item.at).toLocaleTimeString('ru-RU')}</b> · {item.text}</div>)}
            <div className="mt-2 flex gap-2"><input value={manualNote} onChange={(event) => setManualNote(event.target.value)} className="flex-1 rounded-xl border px-3 py-2" placeholder="Добавить запись вручную" /><button onClick={() => { if (manualNote.trim()) { addTimeline(incident.id, manualNote); setManualNote('') } }} className="rounded-xl border px-3 py-2">Добавить</button></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const incidents = useIncidentViews()
  const series = useOutageHistorySeries()
  const construction = useConstructionAggregates()
  const live = useSigmaStore((state) => state.live)
  const indicators = useIndicators()
  const riskCards = useRiskCards()
  const trafficIndex = useTrafficIndex()
  const referenceObjects = useReferenceObjects()
  const [period, setPeriod] = useState('7 дней')
  const category = Object.entries(incidents.reduce<Record<string, number>>((acc, incident) => ({ ...acc, [incident.subsystem]: (acc[incident.subsystem] || 0) + 1 }), {})).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle title="История и аналитика" subtitle="Тренды по накопленным snapshot 051, экологии, calculated traffic index и активному строительству." />
        <div className="flex gap-2">{['7 дней', 'месяц', 'квартал', 'год'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-xl px-3 py-2 ${period === item ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{item}</button>)}</div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-slate-500">Live snapshots 051</div><div className="text-4xl font-bold lg:text-5xl">{live.liveHistory.length}</div><div className="text-slate-500">история накапливается автоматически</div></Card>
        <Card><div className="text-slate-500">Активные стройки</div><div className="text-4xl font-bold lg:text-5xl">{construction.reduce((sum, item) => sum + item.activeConstruction, 0)}</div><div className="text-slate-500">open data active construction</div></Card>
        <Card><div className="text-slate-500">AQI / traffic</div><div className="text-4xl font-bold lg:text-5xl">{indicators.find((item) => item.metric === 'aqi')?.value ?? '—'} / {trafficIndex[0]?.score ?? '—'}</div><div className="text-slate-500">экология и calculated traffic</div></Card>
        <Card><div className="text-slate-500">Risk cards</div><div className="text-4xl font-bold lg:text-5xl">{riskCards.length}</div><div className="text-slate-500">повторяемость правил</div></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-3xl font-bold">Тренд отключений 051</div><div className="text-slate-500">накопленная история snapshots</div></div>
            {series.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}><LineChart data={series.slice(-24)}><XAxis dataKey="label" hide={series.length > 10} /><YAxis /><Tooltip /><Line dataKey="emergency" stroke="#dc2626" strokeWidth={3} dot={false} /><Line dataKey="planned" stroke="#f59e0b" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>
            ) : <div className="rounded-xl border border-dashed p-4 text-sm text-slate-600">История live-источника только накапливается.</div>}
          </Card>
          <Card><div className="mb-2 text-3xl font-bold">Очаги проблем</div><MapView incidents={incidents.slice(0, 10)} referenceObjects={referenceObjects.slice(0, 8)} /></Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card><div className="mb-3 text-3xl font-bold">Распределение по категориям</div><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={category} dataKey="value" nameKey="name">{category.map((_, idx) => <Cell key={idx} fill={['#2563eb', '#0ea5e9', '#8b5cf6', '#64748b'][idx % 4]} />)}</Pie></PieChart></ResponsiveContainer></Card>
          <Card><div className="mb-3 text-3xl font-bold">Строительная аналитика</div><ResponsiveContainer width="100%" height={240}><BarChart data={construction.slice(0, 6)}><XAxis dataKey="districtName" hide /><YAxis /><Tooltip /><Bar dataKey="activeConstruction" fill="#16a34a" /></BarChart></ResponsiveContainer></Card>
          <Card><div className="mb-3 text-3xl font-bold">Экологические и погодные риски</div><div className="space-y-2 text-sm">{riskCards.map((item) => <div key={item.id} className="rounded-xl border p-3">{item.title}: {item.explanation.because.join(' · ')}</div>)}</div></Card>
        </div>
      </div>
    </div>
  )
}

export function ScenariosPage() {
  const { scenarios, scenarioRuns, runScenario, saveScenario } = useSigmaStore()
  const outageSummary = useSigmaStore(selectOutageSummary)
  const construction = useConstructionAggregates()
  const trafficIndex = useTrafficIndex()
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id)
  const scenarioIncidents = useIncidentViews()
  const scenario = scenarios.find((item) => item.id === selectedId)!
  const run = scenarioRuns.filter((item) => item.scenarioId === selectedId).at(-1)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <div className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-500">Библиотека сценариев</div>
          {scenarios.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${item.id === selectedId ? 'border-blue-300 bg-blue-50' : ''}`}><div className="font-semibold">{item.title}</div><div className="text-sm text-slate-500">{item.description}</div></button>)}
          <SourceMetaFooter source="live baseline only" updatedAt={new Date().toISOString()} ttl="n/a" type="simulation + live baseline" status="simulation" />
        </Card>
        <Card>
          <div className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-500">Baseline</div>
          <div className="text-sm text-slate-500">Текущая нагрузка ЖКХ: {outageSummary?.activeIncidents ?? 0} live-событий</div>
          <div className="mt-1 text-sm text-slate-500">Строительная активность: {construction.reduce((sum, item) => sum + item.activeConstruction, 0)} объектов</div>
          <div className="mt-1 text-sm text-slate-500">Traffic index: {trafficIndex[0]?.score ?? '—'} (calculated)</div>
          <button onClick={() => runScenario(scenario.id)} className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"><Play size={16} className="mr-1 inline" />Запустить симуляцию</button>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-9">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title={scenario.title} subtitle="Live-источники используются только как baseline, не как post hoc факт сценария." />
          <button disabled={!run} onClick={() => run && saveScenario(run.id)} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Сохранить сценарий</button>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-4">{scenario.impacts.map((impact, idx) => <Card key={impact.label} className={idx === 0 ? 'border-red-200 bg-red-50' : idx === 1 ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}><div className="text-sm font-semibold uppercase tracking-wide">{impact.label}</div><div className="mt-2 text-5xl font-bold">+{impact.value}%</div></Card>)}</div>
          <div className="lg:col-span-8"><Card><MapView incidents={scenarioIncidents.slice(0, 8)} /></Card></div>
        </div>

        <Card><ResponsiveContainer width="100%" height={160}><LineChart data={scenario.timelinePoints}><XAxis dataKey="name" /><YAxis /><Line dataKey="value" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer><div className="mt-2 text-sm text-slate-500">Статус: {run ? `${run.status} · ожидаемая задержка ${run.expectedDelay}м` : 'запуск не выполнялся'}</div></Card>
      </div>
    </div>
  )
}

export function DeputiesPage() {
  const { deputies, setDeputyMode } = useSigmaStore()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const statuses = useSigmaStore(selectSourceStatuses)
  const riskCards = useRiskCards()
  const [selectedId, setSelectedId] = useState(deputies[0].id)
  const deputy = deputies.find((item) => item.id === selectedId)!

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-9">
        <Card><SectionTitle title="Цифровые заместители" subtitle="Заместители расширены направлениями ЖКХ, экологии, транспорта, строительства и городской инфраструктуры." /></Card>

        <Card>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-4xl font-bold">{deputy.name}</div><Badge text="активен" className="bg-emerald-50 text-emerald-700" /></div>
          <MetaGrid items={[
            { label: 'Активные live-события', value: String(liveSummary?.activeIncidents ?? 0) },
            { label: 'Экологические сигналы', value: String(riskCards.length) },
            { label: 'Источник', value: statuses.find((item) => item.id === 'source-051')?.name ?? '051' },
            { label: 'Последнее обновление', value: statuses.find((item) => item.id === 'source-051')?.lastUpdated ? new Date(statuses.find((item) => item.id === 'source-051')!.lastUpdated!).toLocaleString('ru-RU') : '—' },
          ]} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Операционный режим</div>
              {(['recommendation', 'approval', 'autonomous'] as const).map((mode) => <button key={mode} onClick={() => setDeputyMode(deputy.id, mode)} className={`mb-2 block w-full rounded-xl border p-3 text-left ${deputy.mode === mode ? 'border-blue-300 bg-blue-50' : ''}`}>{mode}</button>)}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Лента производительности</div>
              {deputy.latestActions.map((action, index) => <div key={index} className="mb-2 rounded-xl border p-2"><CheckCircle2 size={14} className="mr-1 inline text-blue-600" />{action}</div>)}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-3"><Card><div className="mb-2 text-xl font-bold">Ожидающие и другие заместители</div>{deputies.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${item.id === selectedId ? 'border-blue-300 bg-blue-50' : ''}`}><div className="font-semibold">{item.name}</div><div className="text-sm text-slate-500">Режим: {item.mode}</div></button>)}</Card></div>
    </div>
  )
}

export function RegulationsPage() {
  const { regulations, createRegulation } = useSigmaStore()
  const incidents = useIncidentViews()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const construction = useConstructionAggregates()
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('ЖКХ')
  const [selected, setSelected] = useState(regulations[0])

  const helper = createColumnHelper<(typeof regulations)[number]>()
  const columns = [helper.accessor('code', { header: 'ID правила' }), helper.accessor('title', { header: 'Название регламента' }), helper.accessor('domain', { header: 'Домен' }), helper.accessor('status', { header: 'Статус' })]
  const table = useReactTable({ data: regulations, columns, getCoreRowModel: getCoreRowModel() })
  const coverage = useMemo(() => {
    const covered = incidents.filter((incident) => incident.linkedRegulationIds.length > 0).length
    return { covered, total: incidents.length, pct: incidents.length === 0 ? 0 : Math.round((covered / incidents.length) * 100) }
  }, [incidents])

  return (
    <div className="space-y-4">
      <Card><SectionTitle title="Реестр регламентов" subtitle="К существующим регламентам добавлены linkage по ЖКХ, экологии, транспорту и строительству." /><MetaGrid items={[{ label: 'Live-события ЖКХ', value: String(liveSummary?.activeIncidents ?? 0) }, { label: 'Активные стройки', value: String(construction.reduce((sum, item) => sum + item.activeConstruction, 0)) }, { label: 'Покрытие логики', value: `${coverage.pct}%` }, { label: 'Рекомендованный домен', value: 'ЖКХ / строительство / экология' }]} /></Card>
      <Card><div className="mb-3 flex flex-wrap gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border px-3 py-2" placeholder="Название правила" /><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-xl border px-3 py-2"><option>ЖКХ</option><option>Строительство</option><option>Дороги</option><option>Экология</option></select><button onClick={() => createRegulation(title || 'Новое правило', domain)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Создать правило</button></div><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-sm"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="border-b py-2 text-left text-slate-500">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.slice(0, 10).map((row) => <tr key={row.id} onClick={() => setSelected(row.original)} className="cursor-pointer hover:bg-slate-50">{row.getVisibleCells().map((cell) => <td key={cell.id} className="border-b py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div></Card>
      <div className="grid gap-4 md:grid-cols-2"><Card><div className="mb-2 text-3xl font-bold">Инспектор логики</div><div className="mb-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-blue-200">utilityType/outageType → регламент ЖКХ{`\n`}ecology risks → регламент оповещения{`\n`}active construction → контур контроля строительства</div><div className="text-sm text-slate-500">{selected.sourceDocument} · {selected.sourceClause}</div></Card><Card><div className="mb-2 text-3xl font-bold">Аудит покрытия</div><div className="mb-2 text-sm">Покрыто: {coverage.covered}/{coverage.total}</div><div className="grid grid-cols-12 gap-1">{Array.from({ length: 48 }).map((_, index) => <div key={index} className={`h-5 rounded ${index % 17 === 0 ? 'bg-amber-300' : index % 9 === 0 ? 'bg-slate-200' : 'bg-emerald-400'}`} />)}</div></Card></div>
    </div>
  )
}

export function SourcesPage() {
  const statuses = useSigmaStore(selectSourceStatuses)
  const rows = [...statuses].sort((left, right) => left.id.localeCompare(right.id))
  return (
    <div className="space-y-4">
      <Card><SectionTitle title="Источники данных" subtitle="Прозрачность ingestion/adapter слоя: raw → normalized → derived → UI/query." /></Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((status) => (
          <Card key={status.id}>
            <div className="flex flex-wrap items-center gap-2"><div className="text-lg font-bold">{status.name}</div><Badge text={`${status.origin}/${status.status}`} className={status.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} /><Badge text={status.dataCategory} className="bg-slate-100 text-slate-700" /></div>
            <div className="mt-2 text-sm text-slate-600">{status.message}</div>
            <MetaGrid items={[{ label: 'ID', value: status.id }, { label: 'TTL', value: `${Math.round(status.ttlMs / 60000)} мин` }, { label: 'Last update', value: status.lastUpdated ? new Date(status.lastUpdated).toLocaleString('ru-RU') : '—' }, { label: 'Rows/Objects', value: `${status.rowCount ?? '—'} / ${status.objectCount ?? '—'}` }, { label: 'Тип', value: status.kind }, { label: 'Направления', value: status.directions.join(', ') }]} />
            <div className="mt-4 flex flex-wrap gap-2 text-sm">{['Обновить источник', 'Открыть источник', 'Посмотреть сырые данные', 'Проверить схему', 'Скачать snapshot'].map((label) => <button key={label} className="rounded-xl border px-3 py-2">{label}</button>)}</div>
            <SourceMetaFooter source={status.sourceUrls[0] ?? '—'} updatedAt={status.lastUpdated} ttl={`${Math.round(status.ttlMs / 60000)} мин`} type={status.dataCategory} status={status.status} />
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PlaceholderPage() {
  return <Card>Раздел в демонстрационной версии</Card>
}
