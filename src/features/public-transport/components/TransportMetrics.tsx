import { Badge, Card, MetaGrid, SourceMetaFooter } from '../../../components/ui'
import { getTransportDistrictLabel } from '../selectors'
import type { DistrictTransportMetrics, TransportRealtimeAvailability, TransportSourceStatus, TransitStop } from '../types'

export const TransportMetrics = ({
  totalStops,
  totalUniqueRoutes,
  pavilionShare,
  districtCount,
  infrastructureIndex,
  topStopsByRouteCount,
  topDistrictsByStopCount,
  topDistrictsByUniqueRoutes,
  selectedDistrict,
  statuses,
  realtime,
}: {
  totalStops: number
  totalUniqueRoutes: number
  pavilionShare: number
  districtCount: number
  infrastructureIndex: number
  topStopsByRouteCount: TransitStop[]
  topDistrictsByStopCount: Array<{ districtName: string; stopCount: number }>
  topDistrictsByUniqueRoutes: Array<{ districtName: string; uniqueRoutes: number }>
  selectedDistrict?: DistrictTransportMetrics
  statuses: TransportSourceStatus[]
  realtime: TransportRealtimeAvailability
}) => (
  <div className="space-y-4">
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Метрики</div>
          <div className="text-2xl font-bold">Честно вычислимые показатели</div>
        </div>
        <Badge text="calculated index" className="bg-amber-50 text-amber-700" />
      </div>
      <MetaGrid items={[
        { label: 'Всего остановок', value: totalStops },
        { label: 'Уникальные маршруты', value: totalUniqueRoutes },
        { label: 'Доля остановок с павильоном', value: `${(pavilionShare * 100).toFixed(1)}%` },
        { label: 'Районы с остановками', value: districtCount },
        { label: 'Индекс инфраструктуры', value: `${infrastructureIndex} (calculated)` },
        { label: 'Realtime', value: realtime.available ? 'подключено' : 'не подключено' },
      ]} />
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{realtime.message}</div>
      <div className="mt-4 space-y-3">
        {statuses.map((status) => (
          <div key={status.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{status.title}</div>
            <div className="mt-1">{status.message}</div>
            <SourceMetaFooter source={`opendata.novo-sibirsk.ru · ID ${status.datasetId}`} updatedAt={status.updatedAt} ttl={`${status.ttlHours} ч`} type={status.dataType} status={`${status.source}/${status.status}`} />
          </div>
        ))}
      </div>
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
      <div className="text-xl font-bold">Топ транспортных узлов</div>
      <div className="mt-3 space-y-2 text-sm">
        {topStopsByRouteCount.slice(0, 10).map((stop) => (
          <div key={stop.id} className="rounded-xl border border-slate-200 p-3">
            <div className="font-semibold">{stop.name}</div>
            <div className="text-slate-600">{getTransportDistrictLabel(stop.district)} · {stop.routesParsed.length} маршрутов</div>
          </div>
        ))}
      </div>
    </Card>

    <Card>
      <div className="text-xl font-bold">Топ районов</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-500">По числу остановок</div>
          <div className="space-y-2 text-sm">
            {topDistrictsByStopCount.map((item) => <div key={item.districtName} className="rounded-xl border border-slate-200 p-3">{item.districtName}: {item.stopCount}</div>)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-500">По уникальным маршрутам</div>
          <div className="space-y-2 text-sm">
            {topDistrictsByUniqueRoutes.map((item) => <div key={item.districtName} className="rounded-xl border border-slate-200 p-3">{item.districtName}: {item.uniqueRoutes}</div>)}
          </div>
        </div>
      </div>
    </Card>
  </div>
)
