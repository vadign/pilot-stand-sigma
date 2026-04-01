import { useEffect } from 'react'
import { AlertTriangle, Siren } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapView } from '../../components/MapView'
import { Badge, Card } from '../../components/ui'
import { formatSourceBadgeLabel } from '../../lib/sourcePresentation'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { useSigmaStore } from '../../store/useSigmaStore'
import { buildIncidentReplayRoute, canOpenIncidentReplay, incidentReplayCtaLabel } from '../incident-replay/availability'
import {
  isHeatSubsystemTab,
  matchesSubsystemTab,
  operationalSubsystemTabs,
  severityStyles,
  type SubsystemTabId,
  SubsystemTabs,
  utilityLabels,
} from './shared'
import { useIncidentViews } from '../../live/selectors'

export default function OperationsPage() {
  const navigate = useNavigate()
  const incidents = useIncidentViews()
  const assignIncident = useSigmaStore((state) => state.assignIncident)
  const escalateIncident = useSigmaStore((state) => state.escalateIncident)
  const archiveIncident = useSigmaStore((state) => state.archiveIncident)
  const takeLiveIncident = useSigmaStore((state) => state.takeLiveIncident)
  const setSelectedIncident = useSigmaStore((state) => state.setSelectedIncident)
  const selectedIncidentId = useSigmaStore((state) => state.selectedIncidentId)
  const [searchParams, setSearchParams] = useSearchParams()
  const subsystemFromParams = searchParams.get('subsystem')
  const subsystem = operationalSubsystemTabs.some((item) => item.id === subsystemFromParams)
    ? subsystemFromParams as SubsystemTabId
    : 'heat'
  const severity = searchParams.get('severity') ?? ''
  const source = searchParams.get('source') ?? 'all'
  const utility = searchParams.get('utility') ?? ''
  const outageKind = searchParams.get('outageKind') ?? ''
  const district = searchParams.get('district') ?? ''
  const selected = searchParams.get('selected') ?? ''
  const isHeatTab = isHeatSubsystemTab(subsystem)

  useEffect(() => {
    if (!selected) return
    setSelectedIncident(selected)
  }, [selected, setSelectedIncident])

  const patchSearchParams = (patch: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    })
    setSearchParams(nextParams, { replace: true })
  }

  const handleSubsystemChange = (nextSubsystem: SubsystemTabId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextSubsystem === 'heat') nextParams.delete('subsystem')
    else nextParams.set('subsystem', nextSubsystem)
    if (!isHeatSubsystemTab(nextSubsystem)) {
      nextParams.delete('source')
      nextParams.delete('utility')
      nextParams.delete('outageKind')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const filtered = incidents.filter(
    (incident) =>
      matchesSubsystemTab(incident, subsystem) &&
      (!severity || incident.severity === severity) &&
      (!district || incident.district === district) &&
      (source === 'all' || incident.sourceKind === source) &&
      (!isHeatTab || !utility || incident.liveMeta?.utilityType === utility) &&
      (!isHeatTab || !outageKind || incident.liveMeta?.outageKind === outageKind),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        <Card>
          <div className="mb-3 text-3xl font-bold">Оперативный монитор</div>
          <div className="mb-3">
            <SubsystemTabs
              value={subsystem}
              onChange={handleSubsystemChange}
              tabs={operationalSubsystemTabs}
            />
          </div>
          <div className="grid gap-2">
            <select
              className="rounded-xl border px-3 py-2"
              value={severity}
              onChange={(event) => patchSearchParams({ severity: event.target.value })}
            >
              <option value="">Критичность: все</option>
              <option value="критический">Критический</option>
              <option value="высокий">Высокий</option>
              <option value="средний">Средний</option>
            </select>
            <select
              className="rounded-xl border px-3 py-2"
              value={source}
              onChange={(event) => patchSearchParams({ source: event.target.value === 'all' ? undefined : event.target.value })}
            >
              <option value="all">Источник: все</option>
              {isHeatTab ? <option value="live">051</option> : <option value="mock">демонстрационный контур</option>}
            </select>
            {isHeatTab && (
              <>
                <select
                  className="rounded-xl border px-3 py-2"
                  value={outageKind}
                  onChange={(event) => patchSearchParams({ outageKind: event.target.value })}
                >
                  <option value="">Тип отключения: все</option>
                  <option value="emergency">{getOutageKindLabel('emergency', 'titlePlural')}</option>
                  <option value="planned">{getOutageKindLabel('planned', 'titlePlural')}</option>
                </select>
                <select
                  className="rounded-xl border px-3 py-2"
                  value={utility}
                  onChange={(event) => patchSearchParams({ utility: event.target.value })}
                >
                  <option value="">Ресурс: все</option>
                  {Object.entries(utilityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </Card>

        {filtered.slice(0, 8).map((incident) => (
          <Card
            key={incident.id}
            className={`border-l-4 ${
              incident.severity === 'критический'
                ? 'border-l-red-500'
                : incident.severity === 'высокий'
                  ? 'border-l-amber-500'
                  : 'border-l-emerald-500'
            }`}
          >
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Badge
                text={`${formatSourceBadgeLabel(incident.sourceBadge)} · ${incident.severity.toUpperCase()}`}
                className={severityStyles[incident.severity]}
              />
              <span className="text-xs text-slate-500">
                {new Date(incident.detectedAt).toLocaleTimeString('ru-RU')}
              </span>
            </div>
            <div className="text-2xl font-bold">{incident.title}</div>
            <div className="mt-1 text-slate-500">{incident.summary}</div>
            {incident.liveMeta && (
              <div className="mt-2 text-sm text-slate-500">
                {utilityLabels[incident.liveMeta.utilityType]} ·{' '}
                {getOutageKindLabel(incident.liveMeta.outageKind, 'singular')} · уровень детализации:
                район
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                onClick={() => assignIncident(incident.id, 'Штаб района')}
                className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white"
              >
                Назначить
              </button>
              <button
                onClick={() => escalateIncident(incident.id)}
                className="rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white"
              >
                Эскалировать
              </button>
              {incident.sourceKind === 'live' ? (
                <button
                  onClick={() => takeLiveIncident(incident.id, 'Штаб ЖКХ')}
                  className="rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white"
                >
                  Взять в работу
                </button>
              ) : (
                <button
                  onClick={() => archiveIncident(incident.id)}
                  className="rounded-lg bg-slate-200 py-2 text-xs font-semibold"
                >
                  Архив
                </button>
              )}
            </div>
            {canOpenIncidentReplay(incident) && (
              <button
                onClick={() => navigate(buildIncidentReplayRoute(incident.id))}
                className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-semibold text-blue-700"
              >
                {incidentReplayCtaLabel}
              </button>
            )}
          </Card>
        ))}

        <button
          onClick={() => alert('Экстренный протокол запущен')}
          className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold text-white"
        >
          <Siren size={18} className="mr-1 inline" />
          Экстренный протокол
        </button>
      </div>

      <div className="col-span-8">
        <Card className="relative">
          <MapView
            incidents={filtered}
            onPick={(incidentId) => {
              setSelectedIncident(incidentId)
              patchSearchParams({ selected: incidentId })
            }}
            plannedTopByHousesLimit={isHeatTab ? 5 : undefined}
            selectedIncidentId={selected || selectedIncidentId}
          />
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-red-200 bg-white p-3 shadow lg:bottom-5 lg:left-auto lg:right-5">
            <div className="font-bold text-red-600">
              <AlertTriangle size={16} className="mr-1 inline" />
              {isHeatTab
                ? 'Поток 051 интегрирован в ленту'
                : `Контур «${operationalSubsystemTabs.find((item) => item.id === subsystem)?.title}» снова доступен`}
            </div>
            <div className="text-sm text-slate-600">
              {isHeatTab
                ? 'Факты из 051 не скрываются локальными действиями. Рабочий процесс ведется поверх сохраненного снимка.'
                : 'Вкладка показывает доменный поток событий на карте и в ленте без переключения между разделами.'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
