/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, BellRing, CheckCircle2, Copy, Download, Play, Plus, Shield, Siren, Sparkles } from 'lucide-react'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { MapView } from '../components/MapView'
import { Badge, Card, SectionTitle } from '../components/ui'
import { useSigmaStore } from '../store/useSigmaStore'

const severityStyles: Record<string, string> = {
  критический: 'border-red-200 bg-red-50 text-red-700',
  высокий: 'border-amber-200 bg-amber-50 text-amber-700',
  средний: 'border-sky-200 bg-sky-50 text-sky-700',
  низкий: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export function BriefingPage() {
  const { briefs, incidents, servicePerformance } = useSigmaStore()
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-9 space-y-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Sigma Управленческий бриф</div>
              <h1 className="text-4xl font-extrabold">Ежедневный управленческий бриф: {new Date().toLocaleDateString('ru-RU')}</h1>
              <p className="mt-2 text-lg text-slate-500">Синтез глобальных операций за последние 24 часа, созданный ИИ.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => window.print()} className="rounded-xl border px-3 py-2 font-semibold"><Download size={14} className="mr-1 inline" />Экспорт PDF</button>
              <button onClick={() => navigator.clipboard.writeText(location.href)} className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white"><Copy size={14} className="mr-1 inline" />Разослать</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Сводка системы</div>
          <p className="mt-2 text-3xl leading-relaxed text-slate-700">
            За последние 24 часа в операциях Sigma наблюдается <b className="text-blue-700">умеренное увеличение</b> развертывания ресурсов.
            Общая стабильность остается высокой — <b>99.8%</b>, а среднее время критического реагирования составило <b>4.2 минуты</b>.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">Критические изменения со вчера</div>
            <div className="mt-3 text-5xl font-bold text-red-600">+15.4%</div>
            <div className="text-slate-500">Дорожные инциденты (север)</div>
          </Card>
          <Card>
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">Средняя задержка отклика</div>
            <div className="mt-3 text-5xl font-bold text-emerald-600">-0.8м</div>
            <div className="text-slate-500">Положительная динамика по службам</div>
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xl font-bold">Активные критические события</div>
            <Badge text="требуется действие" className="bg-red-50 text-red-700" />
          </div>
          {incidents.filter((i) => i.severity === 'критический').slice(0, 4).map((i) => (
            <button key={i.id} onClick={() => navigate(`/incidents/${i.id}`)} className="mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left hover:bg-slate-50">
              <div>
                <div className="font-semibold">{i.title}</div>
                <div className="text-sm text-slate-500">{i.summary}</div>
              </div>
              <div className="text-right text-sm text-slate-500">{new Date(i.detectedAt).toLocaleTimeString('ru-RU')}</div>
            </button>
          ))}
        </Card>

        <Card>
          <div className="mb-3 text-xl font-bold">Метрики эффективности служб</div>
          {servicePerformance.slice(0, 2).map((item) => (
            <div key={item.id} className="mb-4 rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between"><span className="font-semibold">{item.service}</span><span className="text-2xl font-bold text-blue-700">{item.resolvedInTime}%</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.resolvedInTime}%` }} /></div>
            </div>
          ))}
        </Card>
      </div>

      <div className="col-span-3 space-y-4">
        <Card>
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Повестка брифинга</div>
          {briefs.slice(0, 5).map((b) => <div key={b.id} className="border-b py-2 text-sm last:border-none">{b.title}</div>)}
          <button className="mt-3 w-full rounded-xl border py-2 font-semibold">+ Добавить тему</button>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">Живой вид системы</div>
          <MapView incidents={incidents.slice(0, 6)} />
          <Link to="/operations" className="mt-3 block rounded-xl border py-2 text-center font-semibold">Открыть полную карту операций</Link>
        </Card>
      </div>
    </div>
  )
}

export function MayorDashboardPage() {
  const { kpis, incidents, approveIncident, districts } = useSigmaStore()
  const [district, setDistrict] = useState('')
  const filtered = incidents.filter((i) => !district || i.district === district)

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-slate-500"><Sparkles size={14} className="mr-2 inline" />Спросите Сигму: «Какая загруженность дорог в 4-м районе?»</div>
          <Badge text="данные в реальном времени" className="bg-emerald-50 text-emerald-700" />
          <button className="rounded-xl border p-2"><BellRing size={16} /></button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-xl border px-3 py-2" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">Все районы</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {['Отопление', 'Дороги', 'Шум', 'Качество воздуха'].map((f, idx) => (
            <button key={f} className={`rounded-xl border px-4 py-2 font-medium ${idx === 0 ? 'bg-blue-600 text-white' : ''}`}>{f}</button>
          ))}
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <Badge text="статус системы: стабильно" className="mb-3 border-emerald-300 bg-emerald-500/20 text-emerald-100" />
        <h2 className="text-6xl font-extrabold leading-tight">Город функционирует в штатном режиме</h2>
        <p className="mt-3 max-w-4xl text-2xl text-blue-100">Все основные подсистемы работают эффективно. Выявлены локальные инциденты, обработка в контуре.</p>
        <div className="mt-5 flex gap-2">
          <Link to="/briefing" className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-700">Подробный отчёт</Link>
          <Link to="/operations" className="rounded-xl border border-white/30 px-5 py-3 font-semibold">Карта здоровья систем</Link>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((k) => (
          <Link to="/history" key={k.id}><Card><div className="text-sm text-slate-500">{k.title}</div><div className="mt-2 text-5xl font-bold">{k.value}</div><div className="mt-2 text-sm text-slate-500">{k.type.toUpperCase()}</div></Card></Link>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8"><Card><div className="mb-3 text-4xl font-bold">Карта территориальных проблем</div><MapView incidents={filtered.slice(0, 12)} /></Card></div>
        <div className="col-span-4 space-y-3">
          <Card>
            <div className="mb-2 text-4xl font-bold">Срочные действия</div>
            {filtered.slice(0, 3).map((i) => (
              <div key={i.id} className="mb-2 rounded-xl border bg-blue-50 p-3">
                <div className="font-bold">{i.title}</div>
                <div className="text-sm text-slate-500">{i.summary}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => approveIncident(i.id)} className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white">Одобрить</button>
                  <Link to={`/incidents/${i.id}`} className="rounded-lg border px-3 py-2 font-semibold">Обзор</Link>
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
  const { incidents, assignIncident, escalateIncident, archiveIncident, setSelectedIncident } = useSigmaStore()
  const [severity, setSeverity] = useState('')
  const filtered = incidents.filter((i) => !severity || i.severity === severity)

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-4 space-y-3">
        <Card>
          <div className="mb-3 text-4xl font-bold">Оперативный монитор</div>
          <div className="flex gap-2">
            <select className="flex-1 rounded-xl border px-3 py-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Критичность: Все</option>
              <option value="критический">Критичность: Высокая</option>
              <option value="высокий">Высокий</option>
              <option value="средний">Средний</option>
            </select>
          </div>
        </Card>

        {filtered.slice(0, 6).map((i) => (
          <Card key={i.id} className={`border-l-4 ${i.severity === 'критический' ? 'border-l-red-500' : i.severity === 'высокий' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <div className="mb-2 flex items-center justify-between"><Badge text={i.severity.toUpperCase()} className={severityStyles[i.severity]} /><span className="text-xs text-slate-500">{new Date(i.detectedAt).toLocaleTimeString('ru-RU')}</span></div>
            <div className="text-2xl font-bold">{i.title}</div>
            <div className="mt-1 text-slate-500">{i.summary}</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => assignIncident(i.id, 'Штаб района')} className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white">Назначить</button>
              <button onClick={() => escalateIncident(i.id)} className="rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white">Эскалировать</button>
              <button onClick={() => archiveIncident(i.id)} className="rounded-lg bg-slate-200 py-2 text-xs font-semibold">Архив</button>
            </div>
          </Card>
        ))}

        <button onClick={() => alert('Экстренный протокол запущен')} className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold text-white"><Siren size={18} className="mr-1 inline" />Экстренный протокол</button>
      </div>

      <div className="col-span-8">
        <Card className="relative">
          <MapView incidents={filtered} onPick={setSelectedIncident} />
          <div className="absolute bottom-5 right-5 rounded-2xl border border-red-200 bg-white p-3 shadow">
            <div className="font-bold text-red-600"><AlertTriangle size={16} className="mr-1 inline" />НОВЫЙ КРИТИЧЕСКИЙ ИНЦИДЕНТ</div>
            <div className="text-sm text-slate-600">Угроза целостности конструкции. Аномалия сейсмодатчика.</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function IncidentPage() {
  const { id = '' } = useParams()
  const { incidents, regulations, escalateIncident, resolveIncident, addTimeline, toggleRecommendationStep } = useSigmaStore()
  const incident = incidents.find((i) => i.id === id)
  const [manualNote, setManualNote] = useState('')

  if (!incident) return <Card>Инцидент не найден</Card>

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-extrabold">{incident.title}</h1>
            <div className="mt-2 text-slate-500">ID: {incident.id} · Обнаружен: {new Date(incident.detectedAt).toLocaleTimeString('ru-RU')} · Зона: {incident.district}</div>
          </div>
          <div className="space-x-2">
            <button onClick={() => escalateIncident(incident.id)} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold">Эскалировать</button>
            <button onClick={() => resolveIncident(incident.id)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Разрешить инцидент</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Источник</div><div className="text-4xl font-bold">Датчик/051</div></Card>
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Точное местоположение</div><div className="text-4xl font-bold">{incident.coordinates[0].toFixed(4)}°, {incident.coordinates[1].toFixed(4)}°</div></Card>
            <Card><div className="text-sm uppercase tracking-wide text-slate-500">Потеря давления</div><div className="text-4xl font-bold text-red-600">-4.2 бар/мин</div></Card>
          </div>

          <Card>
            <div className="mb-3 text-4xl font-bold">Анализ критичности</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="rounded-xl border p-3"><b>Влияние на жителей:</b> около {incident.affectedPopulation}+ домохозяйств.</div>
                <div className="rounded-xl border p-3"><b>Угроза объектам:</b> зона рядом с критической инфраструктурой.</div>
                <div className="rounded-xl border p-3"><b>Комплаенс-контроль:</b> нарушение дедлайна ведет к штрафу.</div>
              </div>
              <MapView incidents={[incident]} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-4xl font-bold">Рекомендации Sigma Logic</div>
            {incident.recommendations.map((rec) => (
              <div key={rec.id} className="space-y-2">
                {rec.steps.map((step, index) => (
                  <label key={step.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${step.done ? 'border-emerald-200 bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div><div className="text-lg">{step.title}</div></div>
                    <input type="checkbox" checked={step.done} onChange={() => toggleRecommendationStep(incident.id, rec.id, step.id)} />
                  </label>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="bg-blue-50">
            <div className="mb-2 flex items-center gap-2 text-2xl font-bold text-blue-700"><Shield size={18} />Цифровые регламенты</div>
            {regulations.filter((r) => incident.linkedRegulationIds.includes(r.id)).map((r) => (
              <div key={r.id} className="mb-2 rounded-xl border bg-white p-3"><div className="font-semibold">{r.code} · {r.title}</div><div className="text-sm text-slate-500">{r.sourceDocument}, {r.sourceClause}</div></div>
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
            {incident.timeline.map((t) => <div key={t.id} className="mb-2 text-sm"><b>{new Date(t.at).toLocaleTimeString('ru-RU')}</b> · {t.text}</div>)}
            <div className="mt-2 flex gap-2"><input value={manualNote} onChange={(e) => setManualNote(e.target.value)} className="flex-1 rounded-xl border px-3 py-2" placeholder="Добавить запись вручную" /><button onClick={() => { if (manualNote.trim()) { addTimeline(incident.id, manualNote); setManualNote('') } }} className="rounded-xl border px-3 py-2">Добавить</button></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const { incidents } = useSigmaStore()
  const [period, setPeriod] = useState('7 дней')
  const [pattern, setPattern] = useState('')
  const filtered = incidents.filter((i) => i.title.toLowerCase().includes(pattern.toLowerCase()))
  const category = Object.entries(filtered.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.subsystem]: (acc[i.subsystem] || 0) + 1 }), {})).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <SectionTitle title="История и аналитика" />
        <div className="flex gap-2">
          {['7 дней', 'месяц', 'квартал', 'год'].map((p) => <button key={p} onClick={() => setPeriod(p)} className={`rounded-xl px-3 py-2 ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{p}</button>)}
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Поиск паттернов..." />
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><div className="text-slate-500">Ср. время решения</div><div className="text-5xl font-bold">42.5м</div><div className="text-emerald-600">↘ -12% за период</div></Card>
        <Card><div className="text-slate-500">Соблюдение норм</div><div className="text-5xl font-bold">99.8%</div><div className="text-emerald-600">Соответствует</div></Card>
        <Card><div className="text-slate-500">Объем событий</div><div className="text-5xl font-bold">12,842</div><div className="text-red-600">+4.2% рост</div></Card>
        <Card><div className="text-slate-500">Эффективность системы</div><div className="text-5xl font-bold">94.2</div><div className="text-emerald-600">+1.5 индекс</div></Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between"><div className="text-4xl font-bold">Тренд частоты событий</div><div className="text-slate-500">Текущий период / Прошлый период</div></div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filtered.slice(0, 7).map((i, idx) => ({ day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][idx], value: i.progress, prev: Math.max(i.progress - 10, 0) }))}>
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Line dataKey="value" stroke="#1d4ed8" strokeWidth={4} dot={false} />
                <Line dataKey="prev" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card><div className="mb-2 flex items-center justify-between"><div className="text-4xl font-bold">Очаги проблем</div><Link to="/operations" className="font-semibold text-blue-700">Подробная карта</Link></div><MapView incidents={filtered.slice(0, 10)} /></Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card>
            <div className="mb-3 text-4xl font-bold">Распределение по категориям</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={category} dataKey="value" nameKey="name">{category.map((_, idx) => <Cell key={idx} fill={['#2563eb', '#0ea5e9', '#8b5cf6', '#64748b'][idx % 4]} />)}</Pie></PieChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div className="mb-3 text-4xl font-bold">Сравнительный анализ</div>
            <div className="space-y-2">
              <div className="rounded-xl bg-emerald-50 p-3">Скорость решения <b className="float-right text-emerald-700">+14.2%</b></div>
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
          <div className="mb-2 flex items-center justify-between"><div className="text-xl font-bold uppercase tracking-widest text-slate-500">Библиотека сценариев</div><Plus size={16} /></div>
          {scenarios.map((s) => <button key={s.id} onClick={() => setSelectedId(s.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${s.id === selectedId ? 'border-blue-300 bg-blue-50' : ''}`}><div className="font-semibold">{s.title}</div><div className="text-sm text-slate-500">{s.description}</div></button>)}
        </Card>
        <Card>
          <div className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-500">Параметры</div>
          {Object.entries(scenario.parameters).map(([k, v]) => <div key={k} className="mb-2 text-sm">{k} <b className="float-right">{v}</b></div>)}
          <button onClick={() => runScenario(scenario.id)} className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"><Play size={16} className="mr-1 inline" />Запустить симуляцию</button>
        </Card>
      </div>

      <div className="col-span-9 space-y-4">
        <Card className="flex items-center justify-between">
          <SectionTitle title={scenario.title} subtitle="ID симуляции: SM-7742 · Движок v4.2 активен" />
          <button disabled={!run} onClick={() => run && saveScenario(run.id)} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Сохранить сценарий</button>
        </Card>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-3">
            {scenario.impacts.map((impact, idx) => (
              <Card key={impact.label} className={idx === 0 ? 'border-red-200 bg-red-50' : idx === 1 ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}>
                <div className="text-sm font-semibold uppercase tracking-wide">{impact.label}</div>
                <div className="mt-2 text-5xl font-bold">+{impact.value}%</div>
                <div className="text-slate-500">Прогнозный эффект сценария</div>
              </Card>
            ))}
          </div>
          <div className="col-span-8"><Card><MapView incidents={useSigmaStore.getState().incidents.slice(0, 8)} /></Card></div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7"><Card><div className="mb-3 flex items-center justify-between"><div className="text-4xl font-bold">Сравнение мер реагирования</div><ArrowUpRight size={18} /></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border p-3"><div className="text-sm text-slate-500">Базовый сценарий</div><div className="text-4xl font-bold">~1,240</div><div>инцидентов</div></div><div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="text-sm text-slate-500">Предложенная стратегия</div><div className="text-4xl font-bold text-blue-700">~890</div><div>инцидентов</div></div></div></Card></div>
          <div className="col-span-5"><Card><div className="mb-3 text-4xl font-bold">Нагрузка на службы</div>{[['Полиция / Экстренные', 92], ['ЖКХ / Снегоуборка', 78], ['Здравоохранение', 85], ['Транспорт', 54]].map(([name, val]) => <div key={name as string} className="mb-2"><div className="mb-1 text-sm">{name} <b className="float-right">{val}%</b></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-red-500" style={{ width: `${val}%` }} /></div></div>)}</Card></div>
        </div>

        <Card>
          <ResponsiveContainer width="100%" height={150}><LineChart data={scenario.timelinePoints}><XAxis dataKey="name" /><YAxis /><Line dataKey="value" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer>
          <div className="mt-2 text-sm text-slate-500">Статус: {run ? `${run.status} · ожидаемая задержка ${run.expectedDelay}м` : 'запуск не выполнялся'}</div>
        </Card>
      </div>
    </div>
  )
}

export function DeputiesPage() {
  const { deputies, setDeputyMode, incidents } = useSigmaStore()
  const [selectedId, setSelectedId] = useState(deputies[0].id)
  const deputy = deputies.find((d) => d.id === selectedId)!

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-9 space-y-4">
        <Card>
          <SectionTitle title="Цифровые заместители" subtitle="Управляйте автономными рабочими процессами, цифровыми двойниками и операционными границами." />
          <div className="flex gap-2 border-b pb-2">
            {['Все', 'Активные', 'Требуют внимания', 'Архив'].map((tab, i) => <button key={tab} className={`rounded-lg px-3 py-2 font-semibold ${i === 0 ? 'text-blue-700' : 'text-slate-500'}`}>{tab}</button>)}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between"><div className="text-5xl font-bold">{deputy.name}</div><Badge text="активен" className="bg-emerald-50 text-emerald-700" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Операционный режим</div>
              {(['recommendation', 'approval', 'autonomous'] as const).map((mode) => <button key={mode} onClick={() => setDeputyMode(deputy.id, mode)} className={`mb-2 block w-full rounded-xl border p-3 text-left ${deputy.mode === mode ? 'border-blue-300 bg-blue-50' : ''}`}>{mode}</button>)}
              <div className="mt-4 text-sm"><b>Ограничения:</b> {deputy.constraints.join(', ')}</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Лента производительности</div>
              {deputy.latestActions.map((a, idx) => <div key={idx} className="mb-2 rounded-xl border p-2"><CheckCircle2 size={14} className="mr-1 inline text-blue-600" />{a}</div>)}
              <div className="mt-3 text-sm"><b>Эскалация:</b> {(deputy.escalationRate * 100).toFixed(0)}%</div>
              <div className="mt-2">{deputy.activeIncidentIds.map((iid) => <Link key={iid} to={`/incidents/${iid}`} className="mr-2 inline-block rounded-lg bg-blue-50 px-2 py-1 text-sm text-blue-700">{incidents.find((i) => i.id === iid)?.id}</Link>)}</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <Card><div className="text-sm text-slate-500">Всего решений</div><div className="text-5xl font-bold">12,482</div><div className="text-emerald-600">+8.4%</div></Card>
          <Card><div className="text-sm text-slate-500">Уровень эскалации</div><div className="text-5xl font-bold">0.42%</div><div className="text-blue-600">Оптимально</div></Card>
          <Card><div className="text-sm text-slate-500">Пропускная способность</div><div className="text-5xl font-bold">1.2 ГБ/с</div></Card>
          <Card><div className="text-sm text-slate-500">Активные ограничения</div><div className="text-5xl font-bold">42</div></Card>
        </div>
      </div>

      <div className="col-span-3 space-y-3">
        <Card>
          <div className="mb-2 text-xl font-bold">Ожидающие и другие заместители</div>
          {deputies.map((d) => <button key={d.id} onClick={() => setSelectedId(d.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${d.id === selectedId ? 'border-blue-300 bg-blue-50' : ''}`}><div className="font-semibold">{d.name}</div><div className="text-sm text-slate-500">Режим: {d.mode}</div></button>)}
        </Card>
        <Card className="bg-blue-50"><div className="mb-2 text-2xl font-bold text-blue-700">Совет по управлению</div><p className="text-slate-700">Автономный режим экономит ресурсы, но требует регулярной проверки логов соответствия.</p></Card>
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
    return { covered, total: incidents.length, pct: Math.round((covered / incidents.length) * 100) }
  }, [incidents])

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-center gap-2">{['Реестр', 'Аудит покрытия', 'Песочница', 'Контроль качества'].map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-2 font-semibold ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
        <SectionTitle title="Реестр регламентов" subtitle="Официальный источник истин для логики управления городом Sigma" />
        <div className="mt-3 flex gap-2"><button className="rounded-xl border px-4 py-2 font-semibold">Экспорт кода</button><button className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">+ Создать правило</button></div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><div className="text-sm text-slate-500">Активные правила</div><div className="text-5xl font-bold">{regulations.length}</div></Card>
        <Card><div className="text-sm text-slate-500">Покрытие логики</div><div className="text-5xl font-bold">{coverage.pct}%</div></Card>
        <Card><div className="text-sm text-slate-500">Неопределенности</div><div className="text-5xl font-bold text-amber-600">04</div></Card>
        <Card><div className="text-sm text-slate-500">Оценка аудита</div><div className="text-5xl font-bold">A+</div></Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap gap-2"><input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Название правила" /><select value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-xl border px-3 py-2"><option>ЖКХ</option><option>Дороги</option><option>Безопасность</option><option>Экология</option></select><button onClick={() => createRegulation(title || 'Новое правило', domain)} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Создать правило</button></div>
        <table className="w-full text-sm"><thead>{table.getHeaderGroups().map((hg) => <tr key={hg.id}>{hg.headers.map((h) => <th key={h.id} className="border-b py-2 text-left text-slate-500">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.slice(0, 10).map((r) => <tr key={r.id} onClick={() => setSelected(r.original)} className="cursor-pointer hover:bg-slate-50">{r.getVisibleCells().map((c) => <td key={c.id} className="border-b py-2">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody></table>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card><div className="mb-2 text-4xl font-bold">Инспектор логики</div><div className="mb-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-blue-200">if (target_vehicle.classification === 'EMERGENCY') {'{'}\n  preemption_signal.requestPriority('level_ultra')\n{'}'}</div><div className="text-sm text-slate-500">{selected.sourceDocument} · {selected.sourceClause}</div></Card>
        <Card><div className="mb-2 text-4xl font-bold">Аудит покрытия</div><div className="mb-2 text-sm">Покрыто: {coverage.covered}/{coverage.total}</div><div className="grid grid-cols-12 gap-1">{Array.from({ length: 48 }).map((_, idx) => <div key={idx} className={`h-5 rounded ${idx % 17 === 0 ? 'bg-amber-300' : idx % 9 === 0 ? 'bg-slate-200' : 'bg-emerald-400'}`} />)}</div></Card>
      </div>

      {tab === 'Песочница' && <Card>Песочница: тестовое событие прогнано по правилу <b>{selected.code}</b>.</Card>}
      {tab === 'Контроль качества' && <Card>Контроль качества: обнаружено 2 пропуска параметров, статус проверки — в работе.</Card>}
    </div>
  )
}

export function PlaceholderPage() {
  return <Card>Раздел в демонстрационной версии</Card>
}
