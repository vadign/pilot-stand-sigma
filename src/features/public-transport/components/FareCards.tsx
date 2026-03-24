import { Card } from '../../../components/ui'
import type { TransportFare } from '../types'

const modeLabels: Record<string, string> = {
  bus: 'Автобус',
  trolleybus: 'Троллейбус',
  tram: 'Трамвай',
  minibus: 'Маршрутка',
  metro: 'Метро',
  unknown: 'Прочее',
}

export const FareCards = ({ fares }: { fares: TransportFare[] }) => (
  <Card>
    <div className="mb-4">
      <div>
        <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Тарифы</div>
        <div className="text-2xl font-bold">Тарифные карточки</div>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fares.map((fare) => (
        <div key={fare.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">{modeLabels[fare.mode] ?? fare.mode}</div>
            <div className="text-2xl font-bold text-blue-700">{fare.amount.toFixed(0)} ₽</div>
          </div>
          <div className="mt-2 text-sm text-slate-600">{fare.fareType}</div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div>Актуально с: {fare.validFrom ? new Date(fare.validFrom).toLocaleDateString('ru-RU') : '—'}</div>
            <div>Перевозчик: {fare.carrier ?? 'не выделен из набора'}</div>
          </div>
        </div>
      ))}
    </div>
  </Card>
)
