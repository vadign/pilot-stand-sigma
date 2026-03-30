import { useState } from 'react'
import { Shield } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { MapView } from '../../components/MapView'
import { Badge, Card, SourceMetaFooter } from '../../components/ui'
import { getDistrictName } from '../../lib/districts'
import { selectIncidentById } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'
import { sourceTypeLabels, utilityLabels } from './shared'

export default function IncidentPage() {
  const { id = '' } = useParams()
  const incident = useSigmaStore((state) => selectIncidentById(state, id))
  const regulations = useSigmaStore((state) => state.regulations)
  const escalateIncident = useSigmaStore((state) => state.escalateIncident)
  const resolveIncident = useSigmaStore((state) => state.resolveIncident)
  const addTimeline = useSigmaStore((state) => state.addTimeline)
  const toggleRecommendationStep = useSigmaStore((state) => state.toggleRecommendationStep)
  const [manualNote, setManualNote] = useState('')

  if (!incident) return <Card>Инцидент не найден</Card>

  const linkedRegulations = regulations.filter((regulation) =>
    incident.linkedRegulationIds.includes(regulation.id),
  )

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold lg:text-5xl">{incident.title}</h1>
            <div className="mt-2 text-slate-500">
              ID: {incident.id} · Обнаружен: {new Date(incident.detectedAt).toLocaleTimeString('ru-RU')}
              {' · '}Зона: {getDistrictName(incident.district)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              text={`${incident.sourceBadge} · ${sourceTypeLabels[incident.dataType] ?? incident.dataType}`}
              className="bg-blue-50 text-blue-700"
            />
            <button
              onClick={() => escalateIncident(incident.id)}
              className="rounded-xl bg-slate-200 px-4 py-2 font-semibold"
            >
              Эскалировать
            </button>
            {incident.canResolve && (
              <button
                onClick={() => resolveIncident(incident.id)}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
              >
                Разрешить инцидент
              </button>
            )}
          </div>
        </div>
        <SourceMetaFooter
          source={incident.sourceKind === 'live' ? '051.novo-sibirsk.ru' : 'Sigma mock-store'}
          updatedAt={incident.sourceUpdatedAt}
          ttl={incident.sourceKind === 'live' ? '30 мин' : 'n/a'}
          type={sourceTypeLabels[incident.dataType] ?? incident.dataType}
          status={incident.sourceKind === 'live' ? 'ready' : 'mock'}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <div className="text-sm uppercase tracking-wide text-slate-500">Источник</div>
              <div className="text-2xl font-bold">
                {incident.sourceKind === 'live' ? '051 / снимок данных' : 'Mock store'}
              </div>
            </Card>
            <Card>
              <div className="text-sm uppercase tracking-wide text-slate-500">Уровень детализации</div>
              <div className="text-2xl font-bold">{incident.liveMeta ? 'район' : 'точка'}</div>
            </Card>
            <Card>
              <div className="text-sm uppercase tracking-wide text-slate-500">Ресурс</div>
              <div className="text-2xl font-bold">
                {incident.liveMeta ? utilityLabels[incident.liveMeta.utilityType] : 'операционный инцидент'}
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-3 text-3xl font-bold">Анализ критичности</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="rounded-xl border p-3">
                  <b>Влияние на жителей:</b> около {incident.affectedPopulation}+ человек.
                </div>
                <div className="rounded-xl border p-3">
                  <b>Источник данных:</b>{' '}
                  {incident.sourceKind === 'live' ? 'официальный источник 051' : 'демо-модель Sigma'}.
                </div>
                <div className="rounded-xl border p-3">
                  <b>Комментарий:</b> {incident.statusHint ?? 'локальный workflow Sigma'}
                </div>
              </div>
              <MapView incidents={[incident]} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-3xl font-bold">Рекомендации Sigma Logic</div>
            {incident.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="space-y-2">
                {recommendation.steps.map((step, index) => (
                  <label
                    key={step.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                      step.done ? 'border-emerald-200 bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="text-lg">{step.title}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={() =>
                        toggleRecommendationStep(incident.id, recommendation.id, step.id)
                      }
                      disabled={incident.sourceKind === 'live'}
                    />
                  </label>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="bg-blue-50">
            <div className="mb-2 flex items-center gap-2 text-2xl font-bold text-blue-700">
              <Shield size={18} />
              Цифровые регламенты
            </div>
            {linkedRegulations.map((regulation) => (
              <div key={regulation.id} className="mb-2 rounded-xl border bg-white p-3">
                <div className="font-semibold">
                  {regulation.code} · {regulation.title}
                </div>
                <div className="text-sm text-slate-500">
                  {regulation.sourceDocument}, {regulation.sourceClause}
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <div className="text-xl font-bold">Ответственные лица</div>
            <div className="mt-2 font-semibold">{incident.assignee}</div>
            <div className="mt-3 text-sm">
              Прогресс устранения <b className="float-right">{incident.progress}%</b>
            </div>
            <div className="mt-2 h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-blue-600" style={{ width: `${incident.progress}%` }} />
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Срок (дедлайн): {new Date(incident.deadline).toLocaleString('ru-RU')}
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-xl font-bold">Журнал решений</div>
            {incident.timeline.map((item) => (
              <div key={item.id} className="mb-2 text-sm">
                <b>{new Date(item.at).toLocaleTimeString('ru-RU')}</b> · {item.text}
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <input
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                className="flex-1 rounded-xl border px-3 py-2"
                placeholder="Добавить запись вручную"
              />
              <button
                onClick={() => {
                  if (manualNote.trim()) {
                    addTimeline(incident.id, manualNote)
                    setManualNote('')
                  }
                }}
                className="rounded-xl border px-3 py-2"
              >
                Добавить
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
