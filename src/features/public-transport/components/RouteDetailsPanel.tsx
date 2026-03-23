import { Card } from '../../../components/ui'
import { getTransportDistrictLabel } from '../selectors'
import type { TransportRouteMetrics } from '../types'

export const RouteDetailsPanel = ({ route }: { route?: TransportRouteMetrics }) => {
  if (!route) return null

  return (
    <Card>
      <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Маршрут</div>
      <div className="mt-2 text-2xl font-bold">№ {route.routeId}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3 text-sm">Остановок: <span className="font-semibold">{route.stopCount}</span></div>
        <div className="rounded-xl border border-slate-200 p-3 text-sm">Районов: <span className="font-semibold">{route.districtCount}</span></div>
        <div className="rounded-xl border border-slate-200 p-3 text-sm">Тип: <span className="font-semibold">{route.mode}</span></div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">Районы покрытия</div>
        <div className="mt-2 flex flex-wrap gap-2">{route.districts.map((district) => <span key={district} className="rounded-full bg-slate-100 px-2 py-1">{getTransportDistrictLabel(district)}</span>)}</div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">Основные хабы</div>
        <div className="mt-2 space-y-2 text-slate-600">{route.hubStops.map((stop) => <div key={stop.id}>{stop.name} · {getTransportDistrictLabel(stop.district)} · {stop.routesParsed.length} маршрутов</div>)}</div>
      </div>
    </Card>
  )
}
