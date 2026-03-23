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

const modeOptions: Array<TransitMode | 'all'> = ['all', 'bus', 'trolleybus', 'tram', 'minibus', 'metro', 'unknown']

export const TransportFilters = ({
  filters,
  districts,
  routeSuggestions,
  onChange,
  onReset,
}: {
  filters: PublicTransportFiltersValue
  districts: string[]
  routeSuggestions: Array<{ key: string; value: string; label: string; searchValue: string; mode: TransitMode }>
  onChange: (next: PublicTransportFiltersValue) => void
  onReset: () => void
}) => {
  const handleRouteChange = (rawValue: string) => {
    const matchedSuggestion = routeSuggestions.find((route) => route.searchValue === rawValue)
    if (matchedSuggestion) {
      onChange({ ...filters, route: matchedSuggestion.value, mode: matchedSuggestion.mode })
      return
    }

    const exactRouteMatches = routeSuggestions.filter((route) => route.value === rawValue)
    if (exactRouteMatches.length === 1) {
      onChange({ ...filters, route: exactRouteMatches[0].value, mode: exactRouteMatches[0].mode })
      return
    }

    onChange({ ...filters, route: rawValue })
  }

  return (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid gap-3 xl:grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.6fr)_minmax(180px,1fr)_minmax(220px,auto)_minmax(180px,auto)]">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Район
        <select value={filters.district} onChange={(event) => onChange({ ...filters, district: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2">
          <option value="">Все районы</option>
          {districts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Тип транспорта
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 p-2">
          {modeOptions.map((mode) => {
            const isActive = filters.mode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...filters, mode })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {modeLabels[mode]}
              </button>
            )
          })}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Номер маршрута
        <>
          <input value={filters.route} list="transport-route-options" onChange={(event) => handleRouteChange(event.target.value)} placeholder="Например, 10" className="rounded-xl border border-slate-200 px-3 py-2" />
          <datalist id="transport-route-options">
            {routeSuggestions.map((route) => <option key={route.key} value={route.searchValue} label={route.label} />)}
          </datalist>
        </>
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 xl:self-end">
        <input type="checkbox" checked={filters.onlyPavilion} onChange={(event) => onChange({ ...filters, onlyPavilion: event.target.checked })} />
        Только остановки с павильоном
      </label>
      <button onClick={onReset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 xl:self-end">
        Сбросить фильтры
      </button>
    </div>
  </section>
  )
}
