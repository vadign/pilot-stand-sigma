import type { PublicTransportFiltersValue, TransitMode } from '../types'

const modeLabels: Record<TransitMode | 'all', string> = {
  all: 'Все виды',
  bus: 'Автобус',
  trolleybus: 'Троллейбус',
  tram: 'Трамвай',
  minibus: 'Маршрутка',
  metro: 'Метро',
  unknown: 'Не определено',
}

export const TransportFilters = ({
  filters,
  districts,
  onChange,
  onReset,
}: {
  filters: PublicTransportFiltersValue
  districts: string[]
  onChange: (next: PublicTransportFiltersValue) => void
  onReset: () => void
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid gap-3 xl:grid-cols-6">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Район
        <select value={filters.district} onChange={(event) => onChange({ ...filters, district: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2">
          <option value="">Все районы</option>
          {districts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Тип транспорта
        <select value={filters.mode} onChange={(event) => onChange({ ...filters, mode: event.target.value as TransitMode | 'all' })} className="rounded-xl border border-slate-200 px-3 py-2">
          {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Поиск остановки
        <input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Например, Морской" className="rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Номер маршрута
        <input value={filters.route} onChange={(event) => onChange({ ...filters, route: event.target.value })} placeholder="Например, 36" className="rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 xl:mt-6">
        <input type="checkbox" checked={filters.onlyPavilion} onChange={(event) => onChange({ ...filters, onlyPavilion: event.target.checked })} />
        Только остановки с павильоном
      </label>
      <button onClick={onReset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 xl:mt-6">
        Сбросить фильтры
      </button>
    </div>
  </section>
)
