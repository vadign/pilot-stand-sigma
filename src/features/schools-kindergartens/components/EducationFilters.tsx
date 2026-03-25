import type { CoverageConfig } from '../types'

export interface EducationFiltersValue {
  district: string
  institutionType: 'all' | 'school' | 'kindergarten'
  search: string
  address: string
  coverageLayer: 'schools' | 'kindergartens' | 'both'
}

export const EducationFilters = ({
  filters,
  districts,
  coverage,
  onFilters,
  onCoverage,
  onReset,
}: {
  filters: EducationFiltersValue
  districts: string[]
  coverage: CoverageConfig
  onFilters: (value: EducationFiltersValue) => void
  onCoverage: (value: CoverageConfig) => void
  onReset: () => void
}) => (
  <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
    <select value={filters.district} onChange={(e) => onFilters({ ...filters, district: e.target.value })} className="rounded-xl border px-3 py-2">
      <option value="">Все районы</option>{districts.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
    <select value={filters.institutionType} onChange={(e) => onFilters({ ...filters, institutionType: e.target.value as EducationFiltersValue['institutionType'] })} className="rounded-xl border px-3 py-2">
      <option value="all">Все учреждения</option><option value="school">Школы</option><option value="kindergarten">Детские сады</option>
    </select>
    <select value={filters.coverageLayer} onChange={(e) => onFilters({ ...filters, coverageLayer: e.target.value as EducationFiltersValue['coverageLayer'] })} className="rounded-xl border px-3 py-2">
      <option value="both">Покрытие: оба</option><option value="schools">Покрытие: школы</option><option value="kindergartens">Покрытие: детсады</option>
    </select>
    <input value={filters.search} onChange={(e) => onFilters({ ...filters, search: e.target.value })} placeholder="Поиск по названию" className="rounded-xl border px-3 py-2" />
    <input value={filters.address} onChange={(e) => onFilters({ ...filters, address: e.target.value })} placeholder="Поиск по адресу" className="rounded-xl border px-3 py-2" />
    <button onClick={onReset} className="rounded-xl border px-3 py-2 font-semibold">Сбросить фильтры</button>
    <select value={coverage.mode} onChange={(e) => onCoverage({ ...coverage, mode: e.target.value as CoverageConfig['mode'] })} className="rounded-xl border px-3 py-2">
      <option value="nearest">Модель: ближайшее учреждение</option><option value="radius">Модель: радиусная</option>
    </select>
  </div>
)
