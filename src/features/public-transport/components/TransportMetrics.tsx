import { Card, MetaGrid } from '../../../components/ui'
import { getTransportDistrictLabel } from '../selectors'
import type { DistrictTransportMetrics, TransitStop } from '../types'

export const TransportMetrics = ({
  totalStops,
  totalUniqueRoutes,
  pavilionShare,
  districtCount,
  topStopsByRouteCount,
  topDistrictsByStopCount,
  topDistrictsByUniqueRoutes,
  selectedDistrict,
}: {
  totalStops: number
  totalUniqueRoutes: number
  pavilionShare: number
  districtCount: number
  topStopsByRouteCount: TransitStop[]
  topDistrictsByStopCount: Array<{ districtName: string; stopCount: number }>
  topDistrictsByUniqueRoutes: Array<{ districtName: string; uniqueRoutes: number }>
  selectedDistrict?: DistrictTransportMetrics
}) => (
  <div className="space-y-4">
    <Card>
      <MetaGrid items={[
        { label: 'Всего остановок', value: totalStops },
        { label: 'Уникальные маршруты', value: totalUniqueRoutes },
        { label: 'Доля остановок с павильоном', value: `${(pavilionShare * 100).toFixed(1)}%` },
        { label: 'Районы с остановками', value: districtCount },
      ]} />
    </Card>

    {selectedDistrict && (
      <Card>
        <div className="text-xl font-bold">Район: {getTransportDistrictLabel(selectedDistrict.district)}</div>
        <MetaGrid items={[
          { label: 'Остановок', value: selectedDistrict.stopCount },
          { label: 'Уникальных маршрутов', value: selectedDistrict.uniqueRoutes },
          { label: 'Доля павильонов', value: `${(selectedDistrict.pavilionShare * 100).toFixed(1)}%` },
          { label: 'Главный хаб', value: selectedDistrict.richestStop?.name ?? '—' },
          { label: 'Автобусных ссылок', value: selectedDistrict.routesByMode.bus },
          { label: 'Маршруток', value: selectedDistrict.routesByMode.minibus },
        ]} />
      </Card>
    )}

    <Card>
      <div className="text-xl font-bold">Остановки с наибольшим числом маршрутов</div>
      <div className="mt-3 space-y-2 text-sm">
        {topStopsByRouteCount.slice(0, 5).map((stop) => (
          <div key={stop.id} className="rounded-xl border border-slate-200 p-3">
            <div className="font-semibold">{stop.name}</div>
            <div className="text-slate-600">{getTransportDistrictLabel(stop.district)} · {stop.routesParsed.length} маршрутов</div>
          </div>
        ))}
      </div>
    </Card>

    <Card>
      <div className="text-xl font-bold">Районы с наибольшим числом остановок и маршрутов</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-500">Больше всего остановок</div>
          <div className="space-y-2 text-sm">
            {topDistrictsByStopCount.map((item) => <div key={item.districtName} className="rounded-xl border border-slate-200 p-3">{item.districtName}: {item.stopCount}</div>)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-500">Больше всего разных маршрутов</div>
          <div className="space-y-2 text-sm">
            {topDistrictsByUniqueRoutes.map((item) => <div key={item.districtName} className="rounded-xl border border-slate-200 p-3">{item.districtName}: {item.uniqueRoutes}</div>)}
          </div>
        </div>
      </div>
    </Card>
  </div>
)
