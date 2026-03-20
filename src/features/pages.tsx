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
import { selectConstructionAggregates, selectDistrictOutageCards, selectIncidentById, selectIncidentViewList, selectOutageHistorySeries, selectOutageSummary, selectSourceStatuses } from '../live/selectors'

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

const formatDelta = (value?: number) => value === undefined ? '—' : `${value > 0 ? '+' : ''}${value}`

const useDashboardData = () => {
  const districts = useSigmaStore((state) => state.districts)
  const incidents = useSigmaStore(selectIncidentViewList)
  const outageSummary = useSigmaStore(selectOutageSummary)
  const sourceStatuses = useSigmaStore(selectSourceStatuses)
  const construction = useSigmaStore(selectConstructionAggregates)
  const districtCards = useSigmaStore(selectDistrictOutageCards)
  const live = useSigmaStore((state) => state.live)
  return { districts, incidents, outageSummary, sourceStatuses, construction, districtCards, live }
}

const DataSourcePanel = () => {
  const statuses = useSigmaStore(selectSourceStatuses)
  if (statuses.length === 0) return null
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">Live-источники</div>
          <div className="text-2xl font-bold">Состояние официальных данных</div>
        </div>
        <Badge text="runtime → snapshot → cache → mock" className="bg-slate-100 text-slate-700" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {statuses.map((status) => (
          <div key={status.key} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{status.title}</div>
              <Badge text={`${status.source}/${status.status}`} className={status.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : status.status === 'stale' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'} />
            </div>
            <div className="mt-2 text-sm text-slate-600">{status.message}</div>
            <SourceMetaFooter source={status.sourceUrl} updatedAt={status.updatedAt} ttl={`${status.ttlMinutes} мин`} type={sourceTypeLabels[status.type] ?? status.type} status={status.status} />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function BriefingPage() {
  const navigate = useNavigate()
  const { incidents, outageSummary, construction, sourceStatuses } = useDashboardData()
  const liveStatus051 = sourceStatuses.find((item) => item.key === '051')
  const liveStatusOpenData = sourceStatuses.find((item) => item.key === 'opendata')
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
            <p className="mt-2 text-lg text-slate-500">Реальные отключения ЖКХ из 051 и строительная аналитика из открытых данных Новосибирска.</p>
          </div>
          <button onClick={() => window.print()} className="rounded-xl border px-3 py-2 font-semibold"><Download size={14} className="mr-1 inline" />Экспорт PDF</button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Аварийные отключения 051</div><div className="mt-2 text-5xl font-bold text-red-600">{emergencyLive.length}</div><div className="text-slate-500">домов: {outageSummary?.emergencyHouses ?? 0}</div></Card>
        <Card><div className="text-sm text-slate-500">Плановые отключения 051</div><div className="mt-2 text-5xl font-bold text-amber-600">{plannedLive.length}</div><div className="text-slate-500">домов: {outageSummary?.plannedHouses ?? 0}</div></Card>
        <Card><div className="text-sm text-slate-500">Δ к предыдущему snapshot</div><div className="mt-2 text-5xl font-bold text-blue-700">{formatDelta(outageSummary?.delta?.incidents)}</div><div className="text-slate-500">по активным событиям</div></Card>
        <Card><div className="text-sm text-slate-500">Активные стройки</div><div className="mt-2 text-5xl font-bold text-emerald-600">{construction.reduce((sum, item) => sum + item.activeConstruction, 0)}</div><div className="text-slate-500">по open data 124/125</div></Card>
      </div>

      <Card>
        <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Сводка системы</div>
        <p className="mt-2 text-xl leading-relaxed text-slate-700 lg:text-3xl">
          По данным 051 сейчас зарегистрировано <b className="text-blue-700">{outageSummary?.activeIncidents ?? 0} live-событий</b>, из них аварийных — <b>{emergencyLive.length}</b>.
          Наибольшая нагрузка по домам наблюдается в районах {outageSummary?.topDistricts.slice(0, 2).map((item) => item.district).join(' и ') || 'без выраженного лидера'}.
        </p>
        {liveStatus051 && <SourceMetaFooter source="051.novo-sibirsk.ru" updatedAt={liveStatus051.updatedAt} ttl={`${liveStatus051.ttlMinutes} мин`} type={sourceTypeLabels[liveStatus051.type] ?? liveStatus051.type} status={liveStatus051.status} />}
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
          {liveStatusOpenData && <SourceMetaFooter source="opendata.novo-sibirsk.ru" updatedAt={liveStatusOpenData.updatedAt} ttl={`${liveStatusOpenData.ttlMinutes} мин`} type={sourceTypeLabels[liveStatusOpenData.type] ?? liveStatusOpenData.type} status={liveStatusOpenData.status} />}
        </Card>
      </div>

      <DataSourcePanel />
    </div>
  )
}

export function MayorDashboardPage() {
  const { districts, incidents, outageSummary, districtCards, sourceStatuses } = useDashboardData()
  const [district, setDistrict] = useState('')
  const visibleIncidents = incidents.filter((incident) => !district || incident.district === district)
  const liveIncidents = visibleIncidents.filter((incident) => incident.sourceKind === 'live')
  const urgent = liveIncidents.filter((incident) => incident.liveMeta?.outageKind === 'emergency')
  const status051 = sourceStatuses.find((item) => item.key === '051')

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-xl border px-3 py-2" value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">Все районы</option>
            {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Badge text="051 live outages" className="bg-blue-50 text-blue-700" />
          <Badge text="OpenData construction" className="bg-emerald-50 text-emerald-700" />
        </div>
        {status051 && <SourceMetaFooter source="051.novo-sibirsk.ru/SitePages/off.aspx" updatedAt={status051.updatedAt} ttl={`${status051.ttlMinutes} мин`} type={sourceTypeLabels[status051.type] ?? status051.type} status={status051.status} />}
      </Card>

      <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <Badge text="гибридный контур управления" className="mb-3 border-emerald-300 bg-emerald-500/20 text-emerald-100" />
        <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">ЖКХ и теплоснабжение под управлением live-источников</h2>
        <p className="mt-3 max-w-4xl text-lg text-blue-100">
          KPI по отключениям строятся на основе официальной страницы 051, а строительная аналитика — на официальных CSV из open data.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Активные отключения</div><div className="mt-2 text-5xl font-bold">{outageSummary?.activeIncidents ?? 0}</div><div className="mt-2 text-sm text-slate-500">аварийных: {urgent.length}</div></Card>
        <Card><div className="text-sm text-slate-500">Отключено домов</div><div className="mt-2 text-5xl font-bold">{outageSummary?.totalHouses ?? 0}</div><div className="mt-2 text-sm text-slate-500">planned/emergency отдельно</div></Card>
        <Card><div className="text-sm text-slate-500">Аварийный контур</div><div className="mt-2 text-5xl font-bold text-red-600">{outageSummary?.emergencyHouses ?? 0}</div><div className="mt-2 text-sm text-slate-500">домов под аварийным воздействием</div></Card>
        <Card><div className="text-sm text-slate-500">Плановый контур</div><div className="mt-2 text-5xl font-bold text-amber-600">{outageSummary?.plannedHouses ?? 0}</div><div className="mt-2 text-sm text-slate-500">домов в плановых окнах</div></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8"><Card><div className="mb-3 text-3xl font-bold">Карта территориальных проблем</div><MapView incidents={visibleIncidents.slice(0, 20)} /></Card></div>
        <div className="space-y-3 lg:col-span-4">
          <Card>
            <div className="mb-2 text-2xl font-bold">Срочные действия</div>
            {urgent.slice(0, 4).map((incident) => (
              <div key={incident.id} className="mb-2 rounded-xl border bg-blue-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge text={incident.liveMeta?.outageKind === 'emergency' ? 'аварийное' : 'плановое'} className="bg-red-50 text-red-700" />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{getDistrictName(incident.district)}</span>
                </div>
                <div className="mt-2 font-bold">{incident.title}</div>
                <div className="text-sm text-slate-500">{incident.summary}</div>
              </div>
            ))}
          </Card>
          <Card>
            <div className="mb-2 text-2xl font-bold">Топ-районы по отключенным домам</div>
            {districtCards.map((item) => (
              <div key={item.districtName} className="mb-2 rounded-xl border p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">{item.districtName}</span><span className="text-sm text-slate-500">{item.houses} домов</span></div>
                <div className="mt-1 text-sm text-slate-500">Инцидентов: {item.incidents}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Card>
        <div className="mb-3 text-2xl font-bold">Разбивка по ресурсам</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {outageSummary?.utilities.map((item) => (
            <div key={item.utilityType} className="rounded-xl border p-3">
              <div className="font-semibold">{utilityLabels[item.utilityType] ?? item.utilityType}</div>
              <div className="mt-2 text-sm text-slate-500">planned: {item.plannedHouses} · emergency: {item.emergencyHouses}</div>
              <div className="mt-2 text-sm text-slate-500">событий: {item.incidents}</div>
            </div>
          ))}
        </div>
      </Card>

      <DataSourcePanel />
    </div>
  )
}

export function OperationsPage() {
  const incidents = useSigmaStore(selectIncidentViewList)
  const assignIncident = useSigmaStore((state) => state.assignIncident)
  const escalateIncident = useSigmaStore((state) => state.escalateIncident)
  const archiveIncident = useSigmaStore((state) => state.archiveIncident)
  const takeLiveIncident = useSigmaStore((state) => state.takeLiveIncident)
  const setSelectedIncident = useSigmaStore((state) => state.setSelectedIncident)
  const [searchParams] = useSearchParams()
  const [severity, setSeverity] = useState(searchParams.get('severity') ?? '')
  const [source, setSource] = useState(searchParams.get('source') ?? 'all')
  const [utility, setUtility] = useState('')
  const [outageKind, setOutageKind] = useState('')
  const district = searchParams.get('district') ?? ''

  const filtered = incidents.filter((incident) =>
    (!severity || incident.severity === severity)
    && (!district || incident.district === district)
    && (source === 'all' || incident.sourceKind === source)
    && (!utility || incident.liveMeta?.utilityType === utility)
    && (!outageKind || incident.liveMeta?.outageKind === outageKind),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        <Card>
          <div className="mb-3 text-3xl font-bold">Оперативный монитор</div>
          <div className="grid gap-2">
            <select className="rounded-xl border px-3 py-2" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="">Критичность: все</option>
              <option value="критический">Критический</option>
              <option value="высокий">Высокий</option>
              <option value="средний">Средний</option>
            </select>
            <select className="rounded-xl border px-3 py-2" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">Источник: все</option>
              <option value="live">051</option>
              <option value="mock">mock</option>
            </select>
            <select className="rounded-xl border px-3 py-2" value={outageKind} onChange={(event) => setOutageKind(event.target.value)}>
              <option value="">Тип отключения: все</option>
              <option value="emergency">Аварийные</option>
              <option value="planned">Плановые</option>
            </select>
            <select className="rounded-xl border px-3 py-2" value={utility} onChange={(event) => setUtility(event.target.value)}>
              <option value="">Ресурс: все</option>
              {Object.entries(utilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
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
              {incident.sourceKind === 'live'
                ? <button onClick={() => takeLiveIncident(incident.id, 'Штаб ЖКХ')} className="rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white">Взять в работу</button>
                : <button onClick={() => archiveIncident(incident.id)} className="rounded-lg bg-slate-200 py-2 text-xs font-semibold">Архив</button>}
            </div>
          </Card>
        ))}

        <button onClick={() => alert('Экстренный протокол запущен')} className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold text-white"><Siren size={18} className="mr-1 inline" />Экстренный протокол</button>
      </div>

      <div className="col-span-8">
        <Card className="relative">
          <MapView incidents={filtered} onPick={setSelectedIncident} />
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-red-200 bg-white p-3 shadow lg:bottom-5 lg:left-auto lg:right-5">
            <div className="font-bold text-red-600"><AlertTriangle size={16} className="mr-1 inline" />Live-feed 051 интегрирован в ленту</div>
            <div className="text-sm text-slate-600">Факты из 051 не скрываются локальными действиями. Workflow ведется поверх live snapshot.</div>
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
  const [manualNote, setManualNote] = useState('')

  if (!incident) return <Card>Инцидент не найден</Card>

  const linkedRegulations = regulations.filter((regulation) => incident.linkedRegulationIds.includes(regulation.id))

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
              <MapView incidents={[incident]} />
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
            {linkedRegulations.map((regulation) => (
              <div key={regulation.id} className="mb-2 rounded-xl border bg-white p-3"><div className="font-semibold">{regulation.code} · {regulation.title}</div><div className="text-sm text-slate-500">{regulation.sourceDocument}, {regulation.sourceClause}</div></div>
            ))}
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
  const incidents = useSigmaStore(selectIncidentViewList)
  const series = useSigmaStore(selectOutageHistorySeries)
  const construction = useSigmaStore(selectConstructionAggregates)
  const live = useSigmaStore((state) => state.live)
  const [period, setPeriod] = useState('7 дней')
  const category = Object.entries(incidents.reduce<Record<string, number>>((acc, incident) => ({ ...acc, [incident.subsystem]: (acc[incident.subsystem] || 0) + 1 }), {})).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle title="История и аналитика" subtitle="Тренды по накопленным snapshot 051 и агрегатам строительства из open data." />
        <div className="flex gap-2">
          {['7 дней', 'месяц', 'квартал', 'год'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-xl px-3 py-2 ${period === item ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{item}</button>)}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-slate-500">Live snapshots 051</div><div className="text-4xl font-bold lg:text-5xl">{live.liveHistory.length}</div><div className="text-slate-500">история накапливается автоматически</div></Card>
        <Card><div className="text-slate-500">Период</div><div className="text-4xl font-bold lg:text-5xl">{period}</div><div className="text-slate-500">если история короткая, UI честно показывает ограничение</div></Card>
        <Card><div className="text-slate-500">Активные стройки</div><div className="text-4xl font-bold lg:text-5xl">{construction.reduce((sum, item) => sum + item.activeConstruction, 0)}</div><div className="text-slate-500">open data active construction</div></Card>
        <Card><div className="text-slate-500">Режим данных</div><div className="text-4xl font-bold lg:text-5xl">{live.mode}</div><div className="text-slate-500">live / hybrid / mock</div></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-3xl font-bold">Тренд отключений 051</div><div className="text-slate-500">накопленная история snapshots</div></div>
            {series.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={series.slice(-24)}>
                  <XAxis dataKey="label" hide={series.length > 10} /><YAxis /><Tooltip />
                  <Line dataKey="emergency" stroke="#dc2626" strokeWidth={3} dot={false} />
                  <Line dataKey="planned" stroke="#f59e0b" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-slate-600">История live-источника только накапливается. В hybrid-режиме текущий snapshot уже используется, но длинный тренд пока ограничен.</div>
            )}
          </Card>
          <Card><div className="mb-2 text-3xl font-bold">Очаги проблем</div><MapView incidents={incidents.slice(0, 10)} /></Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card>
            <div className="mb-3 text-3xl font-bold">Распределение по категориям</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={category} dataKey="value" nameKey="name">{category.map((_, idx) => <Cell key={idx} fill={['#2563eb', '#0ea5e9', '#8b5cf6', '#64748b'][idx % 4]} />)}</Pie></PieChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div className="mb-3 text-3xl font-bold">Строительная аналитика</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={construction.slice(0, 6)}>
                <XAxis dataKey="districtName" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activeConstruction" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function ScenariosPage() {
  const { scenarios, scenarioRuns, runScenario, saveScenario } = useSigmaStore()
  const outageSummary = useSigmaStore(selectOutageSummary)
  const construction = useSigmaStore(selectConstructionAggregates)
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id)
  const scenarioIncidents = useSigmaStore(selectIncidentViewList)
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
          <button onClick={() => runScenario(scenario.id)} className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"><Play size={16} className="mr-1 inline" />Запустить симуляцию</button>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-9">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title={scenario.title} subtitle="Live-источники используются только как baseline, не как post hoc факт сценария." />
          <button disabled={!run} onClick={() => run && saveScenario(run.id)} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Сохранить сценарий</button>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-4">
            {scenario.impacts.map((impact, idx) => (
              <Card key={impact.label} className={idx === 0 ? 'border-red-200 bg-red-50' : idx === 1 ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}>
                <div className="text-sm font-semibold uppercase tracking-wide">{impact.label}</div>
                <div className="mt-2 text-5xl font-bold">+{impact.value}%</div>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-8"><Card><MapView incidents={scenarioIncidents.slice(0, 8)} /></Card></div>
        </div>

        <Card>
          <ResponsiveContainer width="100%" height={160}><LineChart data={scenario.timelinePoints}><XAxis dataKey="name" /><YAxis /><Line dataKey="value" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer>
          <div className="mt-2 text-sm text-slate-500">Статус: {run ? `${run.status} · ожидаемая задержка ${run.expectedDelay}м` : 'запуск не выполнялся'}</div>
        </Card>
      </div>
    </div>
  )
}

export function DeputiesPage() {
  const { deputies, setDeputyMode } = useSigmaStore()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const statuses = useSigmaStore(selectSourceStatuses)
  const [selectedId, setSelectedId] = useState(deputies[0].id)
  const deputy = deputies.find((item) => item.id === selectedId)!

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-9">
        <Card>
          <SectionTitle title="Цифровые заместители" subtitle="Заместитель по теплоснабжению и ЖКХ получает live-показатели 051 и статус обновления источника." />
        </Card>

        <Card>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-4xl font-bold">{deputy.name}</div><Badge text="активен" className="bg-emerald-50 text-emerald-700" /></div>
          <MetaGrid items={[
            { label: 'Активные live-события', value: String(liveSummary?.activeIncidents ?? 0) },
            { label: 'Районы в фокусе', value: liveSummary?.topDistricts.slice(0, 3).map((item) => item.district).join(', ') || '—' },
            { label: 'Источник', value: statuses.find((item) => item.key === '051')?.title ?? '051' },
            { label: 'Последнее обновление', value: statuses.find((item) => item.key === '051')?.updatedAt ? new Date(statuses.find((item) => item.key === '051')!.updatedAt!).toLocaleString('ru-RU') : '—' },
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

      <div className="space-y-3 lg:col-span-3">
        <Card>
          <div className="mb-2 text-xl font-bold">Ожидающие и другие заместители</div>
          {deputies.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${item.id === selectedId ? 'border-blue-300 bg-blue-50' : ''}`}><div className="font-semibold">{item.name}</div><div className="text-sm text-slate-500">Режим: {item.mode}</div></button>)}
        </Card>
      </div>
    </div>
  )
}

export function RegulationsPage() {
  const { regulations, incidents, createRegulation } = useSigmaStore()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const construction = useSigmaStore(selectConstructionAggregates)
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('ЖКХ')
  const [selected, setSelected] = useState(regulations[0])

  const helper = createColumnHelper<(typeof regulations)[number]>()
  const columns = [
    helper.accessor('code', { header: 'ID правила' }),
    helper.accessor('title', { header: 'Название регламента' }),
    helper.accessor('domain', { header: 'Домен' }),
    helper.accessor('status', { header: 'Статус' }),
  ]

  const table = useReactTable({ data: regulations, columns, getCoreRowModel: getCoreRowModel() })
  const coverage = useMemo(() => {
    const covered = incidents.filter((incident) => incident.linkedRegulationIds.length > 0).length
    return { covered, total: incidents.length, pct: Math.round((covered / incidents.length) * 100) }
  }, [incidents])

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Реестр регламентов" subtitle="Mock-регламенты сохранены, но добавлены live linkage по utility type/outage type и active construction." />
        <MetaGrid items={[
          { label: 'Live-события ЖКХ', value: String(liveSummary?.activeIncidents ?? 0) },
          { label: 'Активные стройки', value: String(construction.reduce((sum, item) => sum + item.activeConstruction, 0)) },
          { label: 'Покрытие логики', value: `${coverage.pct}%` },
          { label: 'Рекомендованный домен', value: 'ЖКХ / строительство' },
        ]} />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border px-3 py-2" placeholder="Название правила" /><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-xl border px-3 py-2"><option>ЖКХ</option><option>Строительство</option><option>Дороги</option><option>Экология</option></select><button onClick={() => createRegulation(title || 'Новое правило', domain)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Создать правило</button></div>
        <div className="overflow-x-auto"><table className="min-w-[700px] w-full text-sm"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="border-b py-2 text-left text-slate-500">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.slice(0, 10).map((row) => <tr key={row.id} onClick={() => setSelected(row.original)} className="cursor-pointer hover:bg-slate-50">{row.getVisibleCells().map((cell) => <td key={cell.id} className="border-b py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><div className="mb-2 text-3xl font-bold">Инспектор логики</div><div className="mb-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-blue-200">utilityType/outageType → регламент ЖКХ{`\n`}active construction → контур контроля строительства</div><div className="text-sm text-slate-500">{selected.sourceDocument} · {selected.sourceClause}</div></Card>
        <Card><div className="mb-2 text-3xl font-bold">Аудит покрытия</div><div className="mb-2 text-sm">Покрыто: {coverage.covered}/{coverage.total}</div><div className="grid grid-cols-12 gap-1">{Array.from({ length: 48 }).map((_, index) => <div key={index} className={`h-5 rounded ${index % 17 === 0 ? 'bg-amber-300' : index % 9 === 0 ? 'bg-slate-200' : 'bg-emerald-400'}`} />)}</div></Card>
      </div>
    </div>
  )
}

export function PlaceholderPage() {
  return <Card>Раздел в демонстрационной версии</Card>
}
