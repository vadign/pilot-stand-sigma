import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapView } from '../../components/MapView'
import { Badge, Card, CollapsibleCardSection } from '../../components/ui'
import { getDistrictName } from '../../lib/districts'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { PublicTransportPage } from '../public-transport'
import { applyMayorTransportParams } from '../public-transport/navigation'
import { SchoolsKindergartensPage } from '../schools-kindergartens'
import {
  buildIncidentDistrictCards,
  buildStatusCards,
  getOutageKindBadgeStyle,
  isEducationSubsystemTab,
  isHeatSubsystemTab,
  isTransportSubsystemTab,
  matchesSubsystemTab,
  readSubsystemFromParams,
  severityStyles,
  sortIncidentsByPriority,
  subsystemTabDescriptions,
  type SubsystemTabId,
  SubsystemTabs,
  transportDistrictOptions,
  transportQueryParamKeys,
  utilityLabels,
  useDashboardData,
} from './shared'

type MayorDashboardViewMode = 'map' | 'list'

type MetricCard = {
  id: string
  label: string
  value: number
  valueClassName?: string
  caption: string
}

const mobileSubsystemDescriptions: Record<SubsystemTabId, string> = {
  heat: 'Отключения и аварии по районам.',
  roads: 'Дорожные инциденты и точки риска.',
  noise: 'Превышения шума и проблемные зоны.',
  air: 'Посты воздуха и экологические сигналы.',
  transport: 'Маршруты, районы и узлы пересадок.',
  education: 'Учреждения, покрытие и районы дефицита.',
}

export default function MayorDashboardPage() {
  const { districts, incidents, outageSummary, districtCards } = useDashboardData()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [district, setDistrict] = useState('')
  const [viewMode, setViewMode] = useState<MayorDashboardViewMode>(() => isDesktop ? 'map' : 'list')
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
  const listIncidents = prioritizedIncidents
  const selectedTransportDistrict = searchParams.get('district') ?? ''
  const primaryViewSummary = viewMode === 'map' ? 'Отображение на карте' : `${listIncidents.length} в списке`
  const priorityItems = (isHeatTab ? urgent : prioritizedIncidents).slice(0, 4)
  const heatAreaItems = districtCards.slice(0, 5)
  const subsystemAreaItems = subsystemDistrictCards.slice(0, 5)
  const metricCards: MetricCard[] = isHeatTab
    ? [
        {
          id: 'active',
          label: 'Активные отключения',
          value: outageSummary?.activeIncidents ?? 0,
          caption: `${getOutageKindLabel('emergency', 'genitivePlural')}: ${urgent.length}`,
        },
        {
          id: 'total',
          label: 'Отключено домов',
          value: outageSummary?.totalHouses ?? 0,
          caption: 'суммарно в текущем контуре',
        },
        {
          id: 'emergency',
          label: 'Экстренный контур',
          value: outageSummary?.emergencyHouses ?? 0,
          valueClassName: 'text-red-600',
          caption: 'домов в экстренном контуре',
        },
        {
          id: 'planned',
          label: 'Контур запланированных отключений',
          value: outageSummary?.plannedHouses ?? 0,
          valueClassName: 'text-amber-600',
          caption: 'домов в запланированных окнах',
        },
      ]
    : [
        {
          id: 'active',
          label: 'Активные события',
          value: visibleIncidents.length,
          caption: 'в выбранном контуре',
        },
        {
          id: 'critical',
          label: 'Критические',
          value: criticalIncidents,
          valueClassName: 'text-red-600',
          caption: 'требуют приоритетного внимания',
        },
        {
          id: 'activeInWork',
          label: 'В работе / эскалированы',
          value: activeInWork,
          valueClassName: 'text-amber-600',
          caption: 'операционный контур',
        },
        {
          id: 'affectedPopulation',
          label: 'Население в зоне',
          value: affectedPopulation,
          valueClassName: 'text-emerald-600',
          caption: 'оценка по карточкам событий',
        },
      ]
  const highlightedMetricIds = isHeatTab ? ['active', 'emergency'] : ['active', 'critical']
  const visibleMetricCards = isDesktop
    ? metricCards
    : metricCards.filter((item) => highlightedMetricIds.includes(item.id))
  const secondaryMetricCards = metricCards.filter((item) => !highlightedMetricIds.includes(item.id))
  const analyticsSummary = isHeatTab
    ? `${outageSummary?.totalHouses ?? 0} домов отключено · ${outageSummary?.plannedHouses ?? 0} в плановом окне`
    : `${activeInWork} в работе · ${affectedPopulation} в зоне`
  const prioritySummary = priorityItems.length > 0
    ? `${priorityItems.length} карточки в фокусе`
    : 'Нет событий в приоритете'
  const areaSummary = (isHeatTab ? heatAreaItems : subsystemAreaItems).length > 0
    ? `${(isHeatTab ? heatAreaItems : subsystemAreaItems)[0].districtName} лидирует по нагрузке`
    : 'Нет данных по районам'

  useEffect(() => {
    setViewMode(isDesktop ? 'map' : 'list')
  }, [isDesktop])

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

  const renderMetricGrid = (cards: MetricCard[]) => (
    <div className={`grid gap-4 ${isDesktop ? 'sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'}`}>
      {cards.map((item) => (
        <Card key={item.id} className="min-w-0">
          <div className="text-sm text-slate-500 break-words">{item.label}</div>
          <div className={`mt-2 text-4xl font-bold leading-none sm:text-5xl ${item.valueClassName ?? ''}`.trim()}>
            {item.value}
          </div>
          <div className="mt-2 text-sm text-slate-500">{item.caption}</div>
        </Card>
      ))}
    </div>
  )

  const priorityContent = (
    <>
      {priorityItems.length > 0 ? (
        priorityItems.map((incident) => (
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
                className={
                  isHeatTab
                    ? getOutageKindBadgeStyle(incident.liveMeta?.outageKind)
                    : severityStyles[incident.severity]
                }
              />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {getDistrictName(incident.district)}
              </span>
            </div>
            <div className="mt-2 font-bold">{incident.title}</div>
            <div className="text-sm text-slate-500">{incident.summary}</div>
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Нет событий для выбранных фильтров.
        </div>
      )}
    </>
  )

  const areasContent = (
    <>
      {(isHeatTab ? heatAreaItems : subsystemAreaItems).length > 0 ? (
        isHeatTab ? (
          heatAreaItems.map((item) => (
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
        ) : (
          subsystemAreaItems.map((item) => (
            <div key={item.districtName} className="mb-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.districtName}</span>
                <span className="text-sm text-slate-500">{item.incidents} событий</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Население в зоне: {item.affectedPopulation}
              </div>
            </div>
          ))
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Нет данных по районам.
        </div>
      )}
    </>
  )

  const analyticsContent = isHeatTab ? (
    <>
      {!isDesktop && renderMetricGrid(secondaryMetricCards)}
      <div className={!isDesktop ? 'mt-4' : ''}>
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
      </div>
    </>
  ) : (
    <>
      {!isDesktop && renderMetricGrid(secondaryMetricCards)}
      <div className={!isDesktop ? 'mt-4' : ''}>
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
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3">
          <SubsystemTabs value={subsystem} onChange={handleSubsystemChange} />
          {!isTransportTab && !isEducationTab ? (
            <div className="flex flex-wrap gap-2">
              <select
                className="w-full min-w-0 rounded-xl border px-3 py-2 sm:w-auto"
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
                className="w-full min-w-0 rounded-xl border px-3 py-2 sm:w-auto"
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

      {isDesktop ? (
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
      ) : (
        <Card>
          <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            Контур управления
          </div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{selectedSubsystemMeta.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{mobileSubsystemDescriptions[subsystem]}</p>
        </Card>
      )}

      {isTransportTab ? (
        <PublicTransportPage embedded />
      ) : isEducationTab ? (
        <SchoolsKindergartensPage embedded />
      ) : (
        <>
          {renderMetricGrid(visibleMetricCards)}

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-2xl font-bold break-words sm:text-3xl">Территориальные события</div>
                    <div className="mt-1 text-sm text-slate-500">{primaryViewSummary}</div>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('map')}
                      aria-pressed={viewMode === 'map'}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        viewMode === 'map'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Карта
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-pressed={viewMode === 'list'}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        viewMode === 'list'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Список
                    </button>
                  </div>
                </div>

                {viewMode === 'map' ? (
                  <MapView
                    incidents={mapIncidents}
                    overlapMode="stack"
                    plannedTopByHousesLimit={isHeatTab ? 5 : undefined}
                  />
                ) : (
                  <div data-testid="mayor-events-list" className="space-y-3">
                    {listIncidents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-500">
                        Нет событий для выбранных фильтров.
                      </div>
                    ) : (
                      listIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          data-testid="mayor-events-list-item"
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                                className={
                                  isHeatTab
                                    ? getOutageKindBadgeStyle(incident.liveMeta?.outageKind)
                                    : severityStyles[incident.severity]
                                }
                              />
                              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                {getDistrictName(incident.district)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-500">Статус: {incident.status}</div>
                          </div>
                          <div className="mt-3 text-xl font-bold text-slate-900">{incident.title}</div>
                          <div className="mt-2 text-sm text-slate-600">{incident.summary}</div>
                          <div className="mt-3 text-sm text-slate-500">
                            {isHeatTab && incident.liveMeta
                              ? `${utilityLabels[incident.liveMeta.utilityType]} · ${getOutageKindLabel(incident.liveMeta.outageKind, 'singular')} · население в зоне: ${incident.affectedPopulation}`
                              : `Население в зоне: ${incident.affectedPopulation}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </div>
            <div className="space-y-3 lg:col-span-4">
              {isDesktop ? (
                <>
                  <Card>
                    <div className="mb-2 text-2xl font-bold">
                      {isHeatTab ? 'Срочные действия' : 'Приоритетные события'}
                    </div>
                    {priorityContent}
                  </Card>
                  <Card>
                    <div className="mb-2 text-2xl font-bold">Районы под нагрузкой</div>
                    {areasContent}
                  </Card>
                </>
              ) : (
                <>
                  <CollapsibleCardSection
                    mobile
                    title={isHeatTab ? 'Срочные действия' : 'Приоритетные события'}
                    summary={prioritySummary}
                    titleClassName="text-lg font-bold"
                  >
                    {priorityContent}
                  </CollapsibleCardSection>
                  <CollapsibleCardSection
                    mobile
                    title="Районы под нагрузкой"
                    summary={areaSummary}
                    titleClassName="text-lg font-bold"
                  >
                    {areasContent}
                  </CollapsibleCardSection>
                </>
              )}
            </div>
          </div>

          {isDesktop ? (
            <Card>{analyticsContent}</Card>
          ) : (
            <CollapsibleCardSection
              mobile
              title="Аналитика"
              summary={analyticsSummary}
              titleClassName="text-lg font-bold"
            >
              {analyticsContent}
            </CollapsibleCardSection>
          )}
        </>
      )}
    </div>
  )
}
