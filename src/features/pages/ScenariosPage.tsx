import { useState } from 'react'
import { Play } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { MapView } from '../../components/MapView'
import { Card, SectionTitle, SourceMetaFooter } from '../../components/ui'
import { selectOutageSummary, useIncidentViews } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'

export default function ScenariosPage() {
  const { scenarios, scenarioRuns, runScenario, saveScenario } = useSigmaStore()
  const outageSummary = useSigmaStore(selectOutageSummary)
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id)
  const scenarioIncidents = useIncidentViews()
  const scenario = scenarios.find((item) => item.id === selectedId)!
  const run = scenarioRuns.filter((item) => item.scenarioId === selectedId).at(-1)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <div className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-500">
            Библиотека сценариев
          </div>
          {scenarios.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`mb-2 w-full rounded-xl border p-3 text-left ${
                item.id === selectedId ? 'border-blue-300 bg-blue-50' : ''
              }`}
            >
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-slate-500">{item.description}</div>
            </button>
          ))}
          <SourceMetaFooter
            source="baseline only"
            updatedAt={new Date().toISOString()}
            ttl="n/a"
            type="simulation + baseline"
            status="simulation"
          />
        </Card>
        <Card>
          <div className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-500">
            Baseline
          </div>
          <div className="text-sm text-slate-500">
            Текущая нагрузка ЖКХ: {outageSummary?.activeIncidents ?? 0} активных событий
          </div>
          <button
            onClick={() => runScenario(scenario.id)}
            className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"
          >
            <Play size={16} className="mr-1 inline" />
            Запустить симуляцию
          </button>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-9">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            title={scenario.title}
            subtitle="Оперативные источники используются только как baseline, не как post hoc факт сценария."
          />
          <button
            disabled={!run}
            onClick={() => run && saveScenario(run.id)}
            className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50"
          >
            Сохранить сценарий
          </button>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-4">
            {scenario.impacts.map((impact, idx) => (
              <Card
                key={impact.label}
                className={
                  idx === 0
                    ? 'border-red-200 bg-red-50'
                    : idx === 1
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-blue-200 bg-blue-50'
                }
              >
                <div className="text-sm font-semibold uppercase tracking-wide">{impact.label}</div>
                <div className="mt-2 text-5xl font-bold">+{impact.value}%</div>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-8">
            <Card>
              <MapView incidents={scenarioIncidents} />
            </Card>
          </div>
        </div>

        <Card>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={scenario.timelinePoints}>
              <XAxis dataKey="name" />
              <YAxis />
              <Line dataKey="value" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 text-sm text-slate-500">
            Статус: {run ? `${run.status} · ожидаемая задержка ${run.expectedDelay}м` : 'запуск не выполнялся'}
          </div>
        </Card>
      </div>
    </div>
  )
}
