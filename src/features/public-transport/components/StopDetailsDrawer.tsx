import { Card } from '../../../components/ui'
import { getTransportDistrictLabel } from '../selectors'
import type { TransitStop } from '../types'

export const StopDetailsDrawer = ({ stop, relatedHubs }: { stop?: TransitStop; relatedHubs: TransitStop[] }) => {
  if (!stop) return null

  const modes = Object.entries(stop.routesParsed.reduce<Record<string, number>>((acc, route) => {
    acc[route.mode] = (acc[route.mode] ?? 0) + 1
    return acc
  }, {}))

  return (
    <Card>
      <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Остановка</div>
      <div className="mt-2 text-2xl font-bold">{stop.name}</div>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <div>Район: {getTransportDistrictLabel(stop.district)}</div>
        <div>Улица: {stop.street || '—'}</div>
        <div>Павильон: {stop.hasPavilion ? 'есть' : 'нет'}</div>
      </div>
      <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">Маршруты</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {stop.routesParsed.map((route) => <span key={route.id} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{route.number}</span>)}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">Разбивка по видам транспорта</div>
        <div className="mt-2 space-y-1 text-slate-600">
          {modes.map(([mode, count]) => <div key={mode}>{mode}: {count}</div>)}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">Похожие пересадочные узлы</div>
        <div className="mt-2 space-y-2 text-slate-600">
          {relatedHubs.map((hub) => <div key={hub.id}>{hub.name} · {hub.routesParsed.length} маршрутов</div>)}
        </div>
      </div>
    </Card>
  )
}
