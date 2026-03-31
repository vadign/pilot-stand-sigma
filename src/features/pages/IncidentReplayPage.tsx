import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, MetaGrid } from '../../components/ui'
import { MapView } from '../../components/MapView'
import { loadIncidentReplayScenario } from '../incident-replay/loadIncidentReplayScenario'
import { IncidentReplayDiagram } from '../incident-replay/components/IncidentReplayDiagram'
import { IncidentReplayTimeline } from '../incident-replay/components/IncidentReplayTimeline'
import { IncidentReplayEventCard } from '../incident-replay/components/IncidentReplayEventCard'
import { selectIncidentById } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'
import type { IncidentReplayScenario } from '../incident-replay/types'

export default function IncidentReplayPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const sigmaState = useSigmaStore()
  const incident = useMemo(() => selectIncidentById(sigmaState, id), [id, sigmaState])
  const [scenario, setScenario] = useState<IncidentReplayScenario>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [activeEventIndex, setActiveEventIndex] = useState(0)

  useEffect(() => {
    if (!incident || incident.subsystem !== 'heat') return

    let cancelled = false
    setLoading(true)
    setError(undefined)

    void loadIncidentReplayScenario(incident)
      .then((nextScenario) => {
        if (cancelled) return
        setScenario(nextScenario)
        setActiveEventIndex(
          Math.max(
            nextScenario.events.findIndex((event) => event.phase === 'incident'),
            0,
          ),
        )
      })
      .catch((reason) => {
        if (cancelled) return
        setError(
          reason instanceof Error ? reason.message : 'Не удалось загрузить сценарий воспроизведения',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [incident])

  const activeEvent = useMemo(
    () => (scenario ? scenario.events[activeEventIndex] : undefined),
    [activeEventIndex, scenario],
  )

  if (!incident) return <Card>Инцидент не найден</Card>

  if (incident.subsystem !== 'heat') {
    return (
      <Card className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(`/incidents/${incident.id}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Назад к карточке инцидента
        </button>
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            Воспроизведение и прогноз инцидента
          </div>
          <h1 className="mt-2 text-3xl font-extrabold">
            Воспроизведение пока доступно только для теплового контура
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Для текущего инцидента сценарий развития пока не поддержан. Первая версия воспроизведения
            построена для аварий теплосети и связанных предаварийных сигналов.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/incidents/${incident.id}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Назад к карточке инцидента
            </button>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Воспроизведение и прогноз инцидента
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold break-words lg:text-4xl">{incident.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Развитие дефекта до аварии и прогноз последствий без вмешательства.
            </p>
          </div>
        </div>
      </Card>

      {loading && <Card>Загружаю сценарий воспроизведения…</Card>}
      {error && <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card>}

      {!loading && !error && scenario && activeEvent && (
        <>
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1">
              <div className="text-lg font-bold">Схема участка и таймлайн сценария</div>
              <div className="text-sm text-slate-500">
                {scenario.districtLabel} район · {scenario.pipeTypeLabel} · {scenario.seasonLabel} ·{' '}
                {scenario.loadLabel}
              </div>
            </div>
            <IncidentReplayDiagram scenario={scenario} event={activeEvent} />
            <div className="border-t border-slate-200 pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-lg font-bold">Таймлайн</div>
                <div className="text-xs font-medium text-slate-500">
                  Выберите контрольную точку или переместите бегунок
                </div>
              </div>
              <IncidentReplayTimeline
                events={scenario.events}
                activeIndex={activeEventIndex}
                onChange={setActiveEventIndex}
              />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <IncidentReplayEventCard scenario={scenario} event={activeEvent} />

            <Card className="p-4">
              <div className="text-lg font-bold">Контекст участка</div>
              <MetaGrid
                items={[
                  { label: 'Контур', value: scenario.networkLabel },
                  { label: 'Тип участка', value: scenario.pipeTypeLabel },
                  { label: 'Сезон', value: scenario.seasonLabel },
                  { label: 'Нагрузка', value: scenario.loadLabel },
                ]}
              />
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                  Инцидент на карте
                </div>
                <MapView incidents={[incident]} />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
