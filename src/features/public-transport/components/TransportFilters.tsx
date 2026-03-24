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
  showDistrictFilter = true,
}: {
  filters: PublicTransportFiltersValue
  districts: string[]
  routeSuggestions: Array<{ key: string; value: string; label: string; searchValue: string; mode: TransitMode }>
  onChange: (next: PublicTransportFiltersValue) => void
  showDistrictFilter?: boolean
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
    <div className="mb-4">
      <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Управление картой</div>
      <div className="mt-1 text-base font-semibold text-slate-900">Что показывать на карте</div>
      <div className="mt-1 text-sm text-slate-500">Выберите вид транспорта и маршрут, чтобы изменить отображение остановок и машин на карте.</div>
    </div>
    <div className={`grid gap-3 ${showDistrictFilter ? 'xl:grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.6fr)_minmax(180px,1fr)]' : 'xl:grid-cols-[minmax(280px,1.6fr)_minmax(180px,1fr)]'}`}>
      {showDistrictFilter && (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Район на карте
          <select value={filters.district} onChange={(event) => onChange({ ...filters, district: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Все районы</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Тип транспорта на карте
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
        Маршрут на карте
        <>
          <input value={filters.route} list="transport-route-options" onChange={(event) => handleRouteChange(event.target.value)} placeholder="Например, автобус 10" className="rounded-xl border border-slate-200 px-3 py-2" />
          <datalist id="transport-route-options">
            {routeSuggestions.map((route) => <option key={route.key} value={route.searchValue} label={route.label} />)}
          </datalist>
        </>
          </label>
    </div>
  </section>
  )
}
