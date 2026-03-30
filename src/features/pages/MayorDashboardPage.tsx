import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapView } from '../../components/MapView'
import { Badge, Card } from '../../components/ui'
import { getDistrictName } from '../../lib/districts'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { PublicTransportPage } from '../public-transport'
import { applyMayorTransportParams } from '../public-transport/navigation'
import { SchoolsKindergartensPage } from '../schools-kindergartens'
import {
  buildIncidentDistrictCards,
  buildStatusCards,
  isEducationSubsystemTab,
  isHeatSubsystemTab,
  isTransportSubsystemTab,
  matchesSubsystemTab,
  readSubsystemFromParams,
  sortIncidentsByPriority,
  subsystemTabDescriptions,
  SubsystemTabs,
  transportDistrictOptions,
  transportQueryParamKeys,
  utilityLabels,
  useDashboardData,
} from './shared'

export default function MayorDashboardPage() {
  const { districts, incidents, outageSummary, districtCards } = useDashboardData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [district, setDistrict] = useState('')
  const subsystem = readSubsystemFromParams(searchParams)
  const subsystemIncidents = incidents.filter((incident) => matchesSubsystemTab(incident, subsystem))
  const visibleIncidents = subsystemIncidents.filter((incident) => !district || incident.district === district)
  const liveIncidents = visibleIncidents.filter((incident) => incident.sourceKind === 'live')
  const urgent = liveIncidents.filter((incident) => incident.liveMeta?.outageKind === 'emergency')
  const prioritizedIncidents = sortIncidentsByPriority(visibleIncidents)
  const subsystemDistrictCards = buildIncidentDistrictCards(visibleIncidents)
  const statusCards = buildStatusCards(visibleIncidents)
  const criticalIncidents = visibleIncidents.filter((incident) => incident.severity === 'критический').length
  const activeInWork = visibleIncidents.filter(
    (incident) => incident.status === 'в работе' || incident.status === 'эскалирован',
  ).length
  const affectedPopulation = visibleIncidents.reduce(
    (sum, incident) => sum + incident.affectedPopulation,
    0,
  )
  const selectedSubsystemMeta = subsystemTabDescriptions[subsystem]
  const isHeatTab = isHeatSubsystemTab(subsystem)
  const isTransportTab = isTransportSubsystemTab(subsystem)
  const isEducationTab = isEducationSubsystemTab(subsystem)
  const mapIncidents = visibleIncidents
  const selectedTransportDistrict = searchParams.get('district') ?? ''

  const handleSubsystemChange = (nextSubsystem: typeof subsystem) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextSubsystem === 'heat') {
      nextParams.delete('subsystem')
    } else {
      nextParams.set('subsystem', nextSubsystem)
    }

    if (isTransportSubsystemTab(nextSubsystem) && !isTransportTab) {
      applyMayorTransportParams(nextParams, 'always')
    }

    if (!isTransportSubsystemTab(nextSubsystem)) {
      transportQueryParamKeys.forEach((key) => nextParams.delete(key))
    }

    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3">
          <SubsystemTabs value={subsystem} onChange={handleSubsystemChange} />
          {!isTransportTab && !isEducationTab ? (
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-xl border px-3 py-2"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              >
                <option value="">Все районы</option>
                {districts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : isTransportTab ? (
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-xl border px-3 py-2"
                value={selectedTransportDistrict}
                onChange={(event) => {
                  const nextParams = new URLSearchParams(searchParams)
                  if (event.target.value) nextParams.set('district', event.target.value)
                  else nextParams.delete('district')
                  setSearchParams(nextParams, { replace: true })
                }}
              >
                <option value="">Все районы</option>
                {transportDistrictOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : null
          }
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <Badge
          text="гибридный контур управления"
          className="mb-3 border-emerald-300 bg-emerald-500/20 text-emerald-100"
        />
        <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          {selectedSubsystemMeta.title}
        </h2>
        <p className="mt-3 max-w-4xl text-lg text-blue-100">
          {selectedSubsystemMeta.description}
        </p>
      </Card>

      {isTransportTab ? (
        <PublicTransportPage embedded />
      ) : isEducationTab ? (
        <SchoolsKindergartensPage embedded />
      ) : (
        <>
          {isHeatTab ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="text-sm text-slate-500">Активные отключения</div>
                <div className="mt-2 text-5xl font-bold">{outageSummary?.activeIncidents ?? 0}</div>
                <div className="mt-2 text-sm text-slate-500">
                  {getOutageKindLabel('emergency', 'genitivePlural')}: {urgent.length}
                </div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">Отключено домов</div>
                <div className="mt-2 text-5xl font-bold">{outageSummary?.totalHouses ?? 0}</div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">Экстренный контур</div>
                <div className="mt-2 text-5xl font-bold text-red-600">
                  {outageSummary?.emergencyHouses ?? 0}
                </div>
                <div className="mt-2 text-sm text-slate-500">домов в экстренном контуре</div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">Контур запланированных отключений</div>
                <div className="mt-2 text-5xl font-bold text-amber-600">
                  {outageSummary?.plannedHouses ?? 0}
                </div>
                <div className="mt-2 text-sm text-slate-500">домов в запланированных окнах</div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="text-sm text-slate-500">Активные события</div>
                <div className="mt-2 text-5xl font-bold">{visibleIncidents.length}</div>
                <div className="mt-2 text-sm text-slate-500">в выбранном контуре</div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">Критические</div>
                <div className="mt-2 text-5xl font-bold text-red-600">{criticalIncidents}</div>
                <div className="mt-2 text-sm text-slate-500">
                  требуют приоритетного внимания
                </div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">В работе / эскалированы</div>
                <div className="mt-2 text-5xl font-bold text-amber-600">{activeInWork}</div>
                <div className="mt-2 text-sm text-slate-500">операционный контур</div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">Население в зоне</div>
                <div className="mt-2 text-5xl font-bold text-emerald-600">
                  {affectedPopulation}
                </div>
                <div className="mt-2 text-sm text-slate-500">оценка по карточкам событий</div>
              </Card>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card>
                <div className="mb-3 text-3xl font-bold">Карта территориальных проблем</div>
                <MapView
                  incidents={mapIncidents}
                  overlapMode="stack"
                  plannedTopByHousesLimit={isHeatTab ? 5 : undefined}
                />
              </Card>
            </div>
            <div className="space-y-3 lg:col-span-4">
              <Card>
                <div className="mb-2 text-2xl font-bold">
                  {isHeatTab ? 'Срочные действия' : 'Приоритетные события'}
                </div>
                {(isHeatTab ? urgent : prioritizedIncidents).slice(0, 4).map((incident) => (
                  <div key={incident.id} className="mb-2 rounded-xl border bg-blue-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        text={
                          isHeatTab
                            ? getOutageKindLabel(
                                incident.liveMeta?.outageKind === 'emergency'
                                  ? 'emergency'
                                  : 'planned',
                                'singular',
                              )
                            : incident.severity
                        }
                        className="bg-red-50 text-red-700"
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {getDistrictName(incident.district)}
                      </span>
                    </div>
                    <div className="mt-2 font-bold">{incident.title}</div>
                    <div className="text-sm text-slate-500">{incident.summary}</div>
                  </div>
                ))}
              </Card>
              <Card>
                <div className="mb-2 text-2xl font-bold">Районы под нагрузкой</div>
                {isHeatTab
                  ? districtCards.slice(0, 5).map((item) => (
                      <div key={item.districtName} className="mb-2 rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{item.districtName}</span>
                          <span className="text-sm text-slate-500">{item.incidents} событий</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Отключенных домов: {item.houses}
                        </div>
                      </div>
                    ))
                  : subsystemDistrictCards.slice(0, 5).map((item) => (
                      <div key={item.districtName} className="mb-2 rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{item.districtName}</span>
                          <span className="text-sm text-slate-500">{item.incidents} событий</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Население в зоне: {item.affectedPopulation}
                        </div>
                      </div>
                    ))}
              </Card>
            </div>
          </div>

          <Card>
            {isHeatTab ? (
              <>
                <div className="mb-3 text-2xl font-bold">Разбивка по ресурсам</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {outageSummary?.utilities.map((item) => (
                    <div key={item.utilityType} className="rounded-xl border p-3">
                      <div className="font-semibold">
                        {utilityLabels[item.utilityType] ?? item.utilityType}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {getOutageKindLabel('planned', 'plural')}: {item.plannedHouses} ·{' '}
                        {getOutageKindLabel('emergency', 'plural')}: {item.emergencyHouses}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">событий: {item.incidents}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 text-2xl font-bold">Разбивка по статусам</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {statusCards.map((item) => (
                    <div key={item.status} className="rounded-xl border p-3">
                      <div className="font-semibold">{item.status}</div>
                      <div className="mt-2 text-3xl font-bold">{item.count}</div>
                      <div className="mt-2 text-sm text-slate-500">событий в контуре</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
