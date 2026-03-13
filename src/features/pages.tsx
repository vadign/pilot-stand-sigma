/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Clock3, Copy, Download, Plus, Shield } from 'lucide-react'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { MapView } from '../components/MapView'
import { Badge, Card, SectionTitle } from '../components/ui'
import { useSigmaStore } from '../store/useSigmaStore'

const sevClass: Record<string, string> = {
  критический: 'bg-red-50 text-red-700 border-red-200',
  высокий: 'bg-amber-50 text-amber-700 border-amber-200',
  средний: 'bg-sky-50 text-sky-700 border-sky-200',
  низкий: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function BriefingPage() {
  const { briefs, incidents, servicePerformance } = useSigmaStore()
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8 space-y-4">
        <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold">Ежедневный управленческий бриф</h1>
              <p className="mt-2 text-blue-100">Сводка за 24 часа по муниципальным подсистемам Новосибирска и Кольцово</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => window.print()} className="rounded-xl bg-white/20 px-3 py-2 text-sm">
                <Download size={14} className="mr-1 inline" /> Экспорт PDF
              </button>
              <button onClick={() => navigator.clipboard.writeText(location.href)} className="rounded-xl bg-white px-3 py-2 text-sm text-blue-700">
                <Copy size={14} className="mr-1 inline" /> Разослать
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Сводка системы</div>
          <p className="mt-2 text-2xl leading-10 text-slate-700">
            За последние 24 часа фиксируется <b className="text-blue-700">умеренное увеличение</b> нагрузки на дороги и
            теплоснабжение. Общая стабильность контуров <b>99.8%</b>.
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xl font-bold">Активные критические события</h3>
            <Badge text="требует действий" className="bg-red-50 text-red-700" />
          </div>
          <div className="space-y-2">
            {incidents
              .filter((i) => i.severity === 'критический')
              .slice(0, 4)
              .map((i) => (
                <button key={i.id} onClick={() => navigate(`/incidents/${i.id}`)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-slate-50">
                  <div>
                    <div className="font-semibold">{i.title}</div>
                    <div className="text-sm text-slate-500">{i.id} · {i.district}</div>
                  </div>
                  <Badge text={i.status} className={sevClass[i.severity]} />
                </button>
              ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-xl font-bold">Метрики эффективности служб</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={servicePerformance}>
              <Bar dataKey="resolvedInTime" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="col-span-4 space-y-4">
        <Card>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Повестка брифинга</div>
          {briefs.slice(0, 6).map((b) => (
            <div key={b.id} className="border-b py-2 text-sm last:border-0">{b.title}</div>
          ))}
          <button className="mt-3 w-full rounded-xl border px-3 py-2 text-sm font-medium">+ Добавить тему</button>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold">Живой вид системы</div>
          <MapView incidents={incidents.slice(0, 8)} />
          <Link to="/operations" className="mt-3 inline-block w-full rounded-xl border px-3 py-2 text-center text-sm font-semibold">
            Открыть полную карту операций
          </Link>
        </Card>
      </div>
    </div>
  )
}

export function MayorDashboardPage() {
  const { districts, incidents, kpis, approveIncident } = useSigmaStore()
  const [district, setDistrict] = useState('')

  const filteredIncidents = incidents.filter((i) => !district || i.district === district)

  return (
    <div className="space-y-4">
      <SectionTitle title="Панель мэра" subtitle="Обзор состояния города, приоритеты и точки согласования" />

      <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <Badge text="статус системы: стабильно" className="mb-3 border-white/20 bg-emerald-500/20 text-emerald-100" />
        <h3 className="text-5xl font-bold leading-tight">Город функционирует в штатном режиме</h3>
        <p className="mt-3 max-w-4xl text-2xl text-blue-100">Выявлено несколько инцидентов, решаются автоматически в рамках регламентов.</p>
        <div className="mt-5 flex gap-2">
          <Link to="/briefing" className="rounded-xl bg-white px-4 py-2 font-semibold text-blue-700">Подробный отчет</Link>
          <Link to="/operations" className="rounded-xl border border-white/30 px-4 py-2 font-semibold">Карта здоровья систем</Link>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className="rounded-xl border px-3 py-2" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">Все районы</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Badge text="данные в реальном времени" className="bg-emerald-50 text-emerald-700" />
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.id} to="/history">
            <Card>
              <div className="text-sm text-slate-500">{k.title}</div>
              <div className="mt-1 text-5xl font-bold">{k.value}</div>
              <div className="mt-1 text-sm text-slate-500">тип данных: {k.type}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Карта территориальных проблем</h3>
            <MapView incidents={filteredIncidents.slice(0, 12)} />
          </Card>
        </div>
        <div className="col-span-4 space-y-3">
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Срочные действия</h3>
            {filteredIncidents.slice(0, 4).map((i) => (
              <div key={i.id} className="mb-2 rounded-xl border bg-blue-50 p-3">
                <div className="font-semibold">{i.title}</div>
                <div className="mb-3 text-sm text-slate-500">{i.summary}</div>
                <div className="flex gap-2">
                  <button onClick={() => approveIncident(i.id)} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">Одобрить</button>
                  <Link className="rounded-lg border px-3 py-2 text-sm font-semibold" to={`/incidents/${i.id}`}>Обзор</Link>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

export function OperationsPage() {
  const { incidents, setSelectedIncident, assignIncident, escalateIncident, archiveIncident } = useSigmaStore()
  const [severity, setSeverity] = useState('')
  const list = incidents.filter((i) => !severity || i.severity === severity)

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-4 space-y-3">
        <Card>
          <h2 className="mb-2 text-3xl font-bold">Оперативный монитор</h2>
          <div className="flex gap-2">
            <select className="w-full rounded-xl border px-3 py-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Критичность: Все</option>
              <option value="критический">Критичность: Высокая</option>
              <option value="высокий">Критичность: Высокий</option>
              <option value="средний">Критичность: Средний</option>
            </select>
          </div>
        </Card>

        {list.slice(0, 8).map((i) => (
          <Card key={i.id} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Badge text={i.severity.toUpperCase()} className={sevClass[i.severity]} />
              <div className="text-xs text-slate-500">{new Date(i.detectedAt).toLocaleTimeString('ru-RU')}</div>
            </div>
            <div className="text-xl font-bold">{i.title}</div>
            <div className="mt-1 text-sm text-slate-500">{i.summary}</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => assignIncident(i.id, 'Диспетчерский штаб')} className="rounded-lg bg-blue-600 px-2 py-2 text-xs font-semibold text-white">Назначить</button>
              <button onClick={() => escalateIncident(i.id)} className="rounded-lg bg-amber-500 px-2 py-2 text-xs font-semibold text-white">Эскалировать</button>
              <button onClick={() => archiveIncident(i.id)} className="rounded-lg bg-slate-200 px-2 py-2 text-xs font-semibold">Архив</button>
            </div>
          </Card>
        ))}

        <button onClick={() => alert('Экстренный протокол активирован: штаб, оповещение, контроль исполнения')} className="w-full rounded-xl bg-red-600 py-3 text-lg font-semibold text-white">
          Экстренный протокол
        </button>
      </div>

      <div className="col-span-8">
        <Card className="relative h-full">
          <MapView incidents={list} onPick={setSelectedIncident} />
          <div className="absolute bottom-5 right-5 rounded-2xl border border-red-200 bg-white p-3 shadow">
            <div className="flex items-center gap-2 font-bold text-red-600"><AlertTriangle size={18} /> Новый критический инцидент</div>
            <div className="text-sm text-slate-600">Угроза целостности конструкции в зоне 7.</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function IncidentPage() {
  const { id = '' } = useParams()
  const { incidents, regulations, resolveIncident, escalateIncident, addTimeline, toggleRecommendationStep } = useSigmaStore()
  const [note, setNote] = useState('')
  const incident = incidents.find((i) => i.id === id)

  if (!incident) return <Card>Инцидент не найден</Card>

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8 space-y-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold">{incident.title}</h1>
              <div className="mt-2 text-slate-500">ID: {incident.id} · зона: {incident.district}</div>
            </div>
            <div className="space-x-2">
              <button onClick={() => escalateIncident(incident.id)} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold">Эскалировать</button>
              <button onClick={() => resolveIncident(incident.id)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Разрешить инцидент</button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card><div className="text-sm text-slate-500">Источник</div><div className="text-3xl font-bold">Датчик/051</div></Card>
          <Card><div className="text-sm text-slate-500">Точное местоположение</div><div className="text-3xl font-bold">{incident.coordinates[0].toFixed(4)}°, {incident.coordinates[1].toFixed(4)}°</div></Card>
          <Card><div className="text-sm text-slate-500">Ключевая потеря</div><div className="text-3xl font-bold text-red-600">-{incident.metrics[0]?.value}</div></Card>
        </div>

        <Card>
          <h3 className="mb-3 text-4xl font-bold">Анализ критичности</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-xl border p-3"><b>Влияние на жителей:</b> до {incident.affectedPopulation} человек</div>
              <div className="rounded-xl border p-3"><b>Комплаенс-контроль:</b> штраф при просрочке дедлайна</div>
            </div>
            <MapView incidents={[incident]} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-4xl font-bold">Рекомендации Sigma Logic</h3>
          {incident.recommendations.map((r) => (
            <div key={r.id} className="space-y-2">
              {r.steps.map((s, idx) => (
                <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${s.done ? 'bg-emerald-50 border-emerald-200' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{idx + 1}</span>
                    <span className="text-lg">{s.title}</span>
                  </div>
                  <input type="checkbox" checked={s.done} onChange={() => toggleRecommendationStep(incident.id, r.id, s.id)} />
                </label>
              ))}
            </div>
          ))}
        </Card>
      </div>

      <div className="col-span-4 space-y-4">
        <Card>
          <div className="mb-2 flex items-center gap-2 text-lg font-bold text-blue-700"><Shield size={18} /> Цифровые регламенты</div>
          {regulations.filter((r) => incident.linkedRegulationIds.includes(r.id)).map((r) => (
            <div key={r.id} className="rounded-xl border bg-blue-50 p-3">
              <div className="font-semibold">{r.code}: {r.title}</div>
              <div className="text-sm text-slate-600">{r.sourceDocument}, {r.sourceClause}</div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="mb-2 text-lg font-bold">Ответственные лица</div>
          <div>{incident.assignee}</div>
          <div className="mt-3 text-sm">Прогресс устранения: {incident.progress}%</div>
          <div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-blue-600" style={{ width: `${incident.progress}%` }} /></div>
        </Card>

        <Card>
          <div className="mb-2 text-lg font-bold">Журнал решений</div>
          <div className="space-y-2">
            {incident.timeline.map((t) => <div key={t.id} className="text-sm"><b>{new Date(t.at).toLocaleTimeString('ru-RU')}</b> · {t.text}</div>)}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 rounded-xl border px-3 py-2" placeholder="Добавить запись вручную" />
            <button onClick={() => { if (note.trim()) { addTimeline(incident.id, note); setNote('') } }} className="rounded-xl bg-blue-600 px-3 py-2 text-white">Добавить</button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const { incidents } = useSigmaStore()
  const [period, setPeriod] = useState('месяц')
  const [query, setQuery] = useState('')
  const filtered = incidents.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
  const category = Object.entries(filtered.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.subsystem]: (acc[i.subsystem] ?? 0) + 1 }), {})).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <SectionTitle title="История и аналитика" />
        <div className="flex gap-2">
          {['7 дней', 'месяц', 'квартал', 'год'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`rounded-xl px-3 py-2 ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{p}</button>
          ))}
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Поиск паттернов..." />
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><div className="text-sm text-slate-500">Ср. время решения</div><div className="text-5xl font-bold">42.5м</div><div className="mt-1 text-emerald-600">↘ -12% за период</div></Card>
        <Card><div className="text-sm text-slate-500">Соблюдение норм</div><div className="text-5xl font-bold">99.8%</div><div className="mt-1 text-emerald-600">соответствует</div></Card>
        <Card><div className="text-sm text-slate-500">Объем событий</div><div className="text-5xl font-bold">{filtered.length}</div><div className="mt-1 text-red-600">+4.2% рост</div></Card>
        <Card><div className="text-sm text-slate-500">Эффективность системы</div><div className="text-5xl font-bold">94.2</div><div className="mt-1 text-emerald-600">+1.5 индекс</div></Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Тренд частоты событий</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filtered.slice(0, 7).map((i, idx) => ({ day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][idx], value: i.progress }))}>
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Line dataKey="value" stroke="#1d4ed8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Очаги проблем</h3>
            <MapView incidents={filtered.slice(0, 10)} />
          </Card>
        </div>
        <div className="col-span-4 space-y-4">
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Распределение по категориям</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={category} dataKey="value" nameKey="name">
                  {category.map((_, idx) => <Cell key={idx} fill={['#2563eb', '#0ea5e9', '#8b5cf6', '#64748b'][idx % 4]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="mb-3 text-4xl font-bold">Сравнительный анализ</h3>
            <div className="space-y-2">
              <div className="rounded-xl bg-emerald-50 p-3">Скорость решений <b className="float-right text-emerald-700">+14.2%</b></div>
              <div className="rounded-xl bg-red-50 p-3">Энергопотребление <b className="float-right text-red-700">-2.1%</b></div>
              <div className="rounded-xl bg-blue-50 p-3">Надежность работы <b className="float-right text-blue-700">+0.8%</b></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function ScenariosPage() {
  const { scenarios, scenarioRuns, runScenario, saveScenario } = useSigmaStore()
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id)
  const scenario = scenarios.find((s) => s.id === selectedId)!
  const run = scenarioRuns.filter((r) => r.scenarioId === selectedId).at(-1)

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3 space-y-4">
        <Card>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-xl font-bold">Библиотека сценариев</h3><Plus size={16} /></div>
          {scenarios.map((s) => (
            <button key={s.id} onClick={() => setSelectedId(s.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${selectedId === s.id ? 'border-blue-400 bg-blue-50' : ''}`}>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-slate-500">{s.description}</div>
            </button>
          ))}
        </Card>
        <Card>
          <h3 className="text-xl font-bold">Параметры</h3>
          {Object.entries(scenario.parameters).map(([k, v]) => <div key={k} className="mt-2 text-sm">{k}: <b>{v}</b></div>)}
          <button onClick={() => runScenario(scenario.id)} className="mt-4 w-full rounded-xl bg-blue-600 py-2 font-semibold text-white">Запустить симуляцию</button>
        </Card>
      </div>

      <div className="col-span-9 space-y-4">
        <Card className="flex items-center justify-between">
          <SectionTitle title={scenario.title} subtitle="Сценарное моделирование без изменения фактических инцидентов" />
          <button disabled={!run} onClick={() => run && saveScenario(run.id)} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Сохранить сценарий</button>
        </Card>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-3">
            {scenario.impacts.map((i) => (
              <Card key={i.label}><div className="text-sm uppercase text-slate-500">{i.label}</div><div className="text-5xl font-bold text-blue-700">+{i.value}%</div></Card>
            ))}
          </div>
          <div className="col-span-8"><Card><MapView incidents={useSigmaStore.getState().incidents.slice(0, 6)} /></Card></div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7">
            <Card>
              <div className="mb-3 flex items-center justify-between"><h3 className="text-3xl font-bold">Сравнение мер реагирования</h3><Clock3 size={18} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3"><div className="text-sm text-slate-500">Базовый сценарий</div><div className="text-4xl font-bold">~1,240</div><div className="text-sm">инцидентов</div></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="text-sm text-slate-500">Предложенная стратегия</div><div className="text-4xl font-bold text-blue-700">~890</div><div className="text-sm">инцидентов</div></div>
              </div>
            </Card>
          </div>
          <div className="col-span-5">
            <Card>
              <h3 className="mb-3 text-3xl font-bold">Нагрузка на службы</h3>
              <div className="space-y-2">
                {[['Полиция', 92], ['ЖКХ', 78], ['Здравоохранение', 85], ['Транспорт', 54]].map(([name, v]) => (
                  <div key={name as string}>
                    <div className="mb-1 text-sm">{name} <b className="float-right">{v}%</b></div>
                    <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-red-500" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={scenario.timelinePoints}><XAxis dataKey="name" /><YAxis /><Line dataKey="value" stroke="#2563eb" strokeWidth={3} /></LineChart>
          </ResponsiveContainer>
          <div className="mt-2 text-sm text-slate-500">Статус запуска: {run ? `${run.status}, рост инцидентов ${run.projectedIncidents}` : 'нет запусков'}</div>
        </Card>
      </div>
    </div>
  )
}

export function DeputiesPage() {
  const { deputies, incidents, setDeputyMode } = useSigmaStore()
  const [selectedId, setSelectedId] = useState(deputies[0].id)
  const deputy = deputies.find((d) => d.id === selectedId)!

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-9 space-y-4">
        <Card>
          <SectionTitle title="Цифровые заместители" subtitle="Управляйте режимами, полномочиями и ограничениями" />
          <div className="flex gap-2">
            {(['recommendation', 'approval', 'autonomous'] as const).map((mode) => (
              <button key={mode} onClick={() => setDeputyMode(deputy.id, mode)} className={`rounded-xl px-4 py-2 font-semibold ${deputy.mode === mode ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                {mode}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-4xl font-bold">{deputy.name}</h3>
            <Badge text="активен" className="bg-emerald-50 text-emerald-700" />
          </div>
          <p className="text-lg text-slate-600">{deputy.domain}. Эскалация {(deputy.escalationRate * 100).toFixed(0)}%</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <h4 className="mb-2 font-semibold">Полномочия</h4>
              {deputy.permissions.map((p) => <div key={p} className="mb-2 rounded-xl bg-slate-50 p-2">{p}</div>)}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Ограничения</h4>
              {deputy.constraints.map((c) => <div key={c} className="mb-2 rounded-xl bg-amber-50 p-2">{c}</div>)}
            </div>
          </div>
          <div className="mt-4">
            <h4 className="mb-2 font-semibold">Активные инциденты</h4>
            {deputy.activeIncidentIds.map((id) => (
              <Link key={id} to={`/incidents/${id}`} className="mr-2 inline-block rounded-lg bg-blue-50 px-2 py-1 text-sm text-blue-700">
                {incidents.find((i) => i.id === id)?.title}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="col-span-3 space-y-3">
        {deputies.map((d) => (
          <button key={d.id} onClick={() => setSelectedId(d.id)} className={`w-full rounded-2xl border p-3 text-left ${d.id === selectedId ? 'border-blue-400 bg-blue-50' : 'bg-white'}`}>
            <div className="font-semibold">{d.name}</div>
            <div className="text-sm text-slate-500">Режим: {d.mode}</div>
          </button>
        ))}
        <Card className="bg-blue-50">
          <h4 className="mb-2 text-xl font-bold text-blue-700">Совет по управлению</h4>
          <p className="text-sm text-slate-700">Автономный режим ускоряет реагирование, но требует еженедельного аудита логов.</p>
        </Card>
      </div>
    </div>
  )
}

export function RegulationsPage() {
  const { regulations, incidents, createRegulation } = useSigmaStore()
  const [tab, setTab] = useState('Реестр')
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('ЖКХ')
  const [selected, setSelected] = useState(regulations[0])

  const helper = createColumnHelper<(typeof regulations)[number]>()
  const columns = [
    helper.accessor('code', { header: 'ID правила' }),
    helper.accessor('title', { header: 'Название регламента' }),
    helper.accessor('domain', { header: 'Домен' }),
    helper.accessor('version', { header: 'Версия' }),
    helper.accessor('status', { header: 'Статус' }),
  ]

  const table = useReactTable({ data: regulations, columns, getCoreRowModel: getCoreRowModel() })

  const coverage = useMemo(() => {
    const covered = incidents.filter((i) => i.linkedRegulationIds.length > 0).length
    return { covered, all: incidents.length, pct: Math.round((covered / incidents.length) * 100) }
  }, [incidents])

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          {['Реестр', 'Аудит покрытия', 'Песочница', 'Контроль качества'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-2 font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{t}</button>
          ))}
        </div>
        <SectionTitle title="Реестр регламентов" subtitle="Официальный источник правил и логики реагирования" />
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><div className="text-sm text-slate-500">Активные правила</div><div className="text-5xl font-bold">{regulations.length}</div></Card>
        <Card><div className="text-sm text-slate-500">Покрытие логики</div><div className="text-5xl font-bold">{coverage.pct}%</div></Card>
        <Card><div className="text-sm text-slate-500">Неопределенности</div><div className="text-5xl font-bold text-amber-600">04</div></Card>
        <Card><div className="text-sm text-slate-500">Оценка аудита</div><div className="text-5xl font-bold">A+</div></Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Название правила" />
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-xl border px-3 py-2"><option>ЖКХ</option><option>Дороги</option><option>Безопасность</option><option>Экология</option></select>
          <button onClick={() => createRegulation(title || 'Новое правило', domain)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Создать правило</button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `${selected.code}.json`
              a.click()
            }}
            className="rounded-xl border px-4 py-2 font-semibold"
          >
            Экспорт кода
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => <th key={h.id} className="border-b py-2 text-left text-slate-500">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.slice(0, 10).map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.original)} className="cursor-pointer hover:bg-slate-50">
                  {r.getVisibleCells().map((c) => <td key={c.id} className="border-b py-2">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="mb-2 text-3xl font-bold">Инспектор логики</h3>
          <div className="mb-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-emerald-300">if (incident.type === '{selected.linkedIncidentTypes[0]}') {'{'}\n escalate();\n assignCrew();\n{'}'}</div>
          <div className="text-sm text-slate-600">{selected.sourceDocument} · {selected.sourceClause}</div>
        </Card>
        <Card>
          <h3 className="mb-2 text-3xl font-bold">Аудит покрытия</h3>
          <div className="mb-2 text-sm">Покрыто: {coverage.covered}/{coverage.all}</div>
          <div className="grid grid-cols-12 gap-1">{Array.from({ length: 48 }).map((_, i) => <div key={i} className={`h-5 rounded ${i % 13 === 0 ? 'bg-amber-300' : 'bg-emerald-400'}`} />)}</div>
        </Card>
      </div>

      {tab === 'Песочница' && <Card>Песочница: тестовое событие прогнано по правилу <b>{selected.code}</b>.</Card>}
      {tab === 'Контроль качества' && <Card>Контроль качества: найдено 2 пропуска параметров, статус проверки — в работе.</Card>}
    </div>
  )
}

export function PlaceholderPage() {
  return <Card>Раздел в демонстрационной версии</Card>
}
