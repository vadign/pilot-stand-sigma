import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSearchParams } from 'react-router-dom'
import { MapView } from '../../components/MapView'
import { Card, SectionTitle } from '../../components/ui'
import { getDistrictName } from '../../lib/districts'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { useSigmaStore } from '../../store/useSigmaStore'
import { useIncidentViews, useOutageHistorySeries } from '../../live/selectors'
import { formatSourceModeLabel } from '../../lib/sourcePresentation'

export default function HistoryPage() {
  const incidents = useIncidentViews()
  const series = useOutageHistorySeries()
  const live = useSigmaStore((state) => state.live)
  const [searchParams, setSearchParams] = useSearchParams()
  const period = searchParams.get('period') ?? '7d'
  const focus = searchParams.get('focus') ?? 'trend'
  const category = Object.entries(
    incidents.reduce<Record<string, number>>(
      (acc, incident) => ({ ...acc, [incident.subsystem]: (acc[incident.subsystem] || 0) + 1 }),
      {},
    ),
  ).map(([name, value]) => ({ name, value }))
  const liveIncidentCount = incidents.filter((incident) => incident.sourceKind === 'live').length

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle
          title="История и аналитика"
          subtitle="Тренды по накопленным снимкам 051 и оперативным событиям."
        />
        <div className="flex gap-2">
          {[
            ['7 дней', '7d'],
            ['месяц', '1m'],
            ['квартал', '1q'],
            ['год', '1y'],
          ].map(([label, value]) => (
            <button
              key={value}
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams)
                if (value === '7d') nextParams.delete('period')
                else nextParams.set('period', value)
                setSearchParams(nextParams, { replace: true })
              }}
              className={`rounded-xl px-3 py-2 ${
                period === value ? 'bg-slate-900 text-white' : 'bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-slate-500">Снимки 051</div>
          <div className="text-4xl font-bold lg:text-5xl">{live.liveHistory.length}</div>
          <div className="text-slate-500">история накапливается автоматически</div>
        </Card>
        <Card>
          <div className="text-slate-500">Период</div>
          <div className="text-4xl font-bold lg:text-5xl">
            {period === '1m' ? 'месяц' : period === '1q' ? 'квартал' : period === '1y' ? 'год' : '7 дней'}
          </div>
          <div className="text-slate-500">если история короткая, интерфейс честно показывает ограничение</div>
        </Card>
        <Card>
          <div className="text-slate-500">Активные события 051</div>
          <div className="text-4xl font-bold lg:text-5xl">{liveIncidentCount}</div>
          <div className="text-slate-500">текущий оперативный контур ЖКХ</div>
        </Card>
        <Card>
          <div className="text-slate-500">Режим данных</div>
          <div className="text-4xl font-bold lg:text-5xl">{formatSourceModeLabel(live.mode)}</div>
          <div className="text-slate-500">прямой / гибридный / демонстрационный</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className={focus === 'trend' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-3xl font-bold">Тренд отключений 051</div>
              <div className="text-slate-500">накопленная история снимков</div>
            </div>
            {series.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={series.slice(-24)}>
                  <XAxis dataKey="label" hide={series.length > 10} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    dataKey="emergency"
                    name={getOutageKindLabel('emergency', 'titlePlural')}
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    dataKey="planned"
                    name={getOutageKindLabel('planned', 'titlePlural')}
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-slate-600">
                История источника 051 только накапливается. В гибридном режиме текущий снимок уже
                используется, но длинный тренд пока ограничен.
              </div>
            )}
          </Card>
          <Card className={focus === 'map' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
            <div className="mb-2 text-3xl font-bold">Очаги проблем</div>
            <MapView incidents={incidents} plannedTopByHousesLimit={5} />
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className={focus === 'categories' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
            <div className="mb-3 text-3xl font-bold">Распределение по категориям</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={category} dataKey="value" nameKey="name">
                  {category.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={['#2563eb', '#0ea5e9', '#8b5cf6', '#64748b'][idx % 4]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className={focus === 'districts' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}>
            <div className="mb-3 text-3xl font-bold">Топ районов</div>
            <div className="space-y-2">
              {(live.outages?.payload.summary.topDistricts ?? []).slice(0, 6).map((item) => (
                <div key={`${item.district}-${item.districtId ?? 'na'}`} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {getDistrictName(item.districtId ?? item.district)}
                    </span>
                    <span className="text-sm text-slate-500">{item.incidents} событий</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Отключенных домов: {item.houses}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
