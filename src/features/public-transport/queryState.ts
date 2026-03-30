import type { PublicTransportFiltersValue, TransitMode } from './types'

export interface TransportConnectivityValue {
  from: string
  to: string
}

export const defaultFilters: PublicTransportFiltersValue = {
  district: '',
  mode: 'all',
  search: '',
  route: '',
  onlyPavilion: false,
}

export const transportFilterParamKeys = [
  'district',
  'mode',
  'search',
  'route',
  'pavilion',
  'pavilionOnly',
  'fromDistrict',
  'toDistrict',
  'focus',
] as const

export const normalizeTransportText = (value: string) =>
  value.trim().toLowerCase().replace(/ё/g, 'е')

export const transportModeByRouteType = (type: number): TransitMode => {
  if (type === 1) return 'trolleybus'
  if (type === 2) return 'tram'
  if (type === 7) return 'minibus'
  return 'bus'
}

export const transportLabelByRouteType = (type: number): string => {
  if (type === 1) return 'Троллейбус'
  if (type === 2) return 'Трамвай'
  if (type === 7) return 'Маршрутка'
  return 'Автобус'
}

export const readFiltersFromParams = (
  params: URLSearchParams,
  withDefaults = false,
): PublicTransportFiltersValue => ({
  district: params.get('district') ?? (withDefaults ? defaultFilters.district : ''),
  mode:
    (params.get('mode') as PublicTransportFiltersValue['mode']) ||
    (withDefaults ? defaultFilters.mode : 'all'),
  search: params.get('search') ?? (withDefaults ? defaultFilters.search : ''),
  route: params.get('route') ?? (withDefaults ? defaultFilters.route : ''),
  onlyPavilion: params.get('pavilion') === '1' || params.get('pavilionOnly') === 'true',
})

export const readConnectivityFromParams = (params: URLSearchParams): TransportConnectivityValue => ({
  from: params.get('fromDistrict') ?? params.get('district') ?? '',
  to: params.get('toDistrict') ?? params.get('compareTo') ?? '',
})

export const writeFiltersToParams = (
  filters: PublicTransportFiltersValue,
  currentParams: URLSearchParams,
): URLSearchParams => {
  const params = new URLSearchParams(currentParams)
  transportFilterParamKeys.forEach((key) => params.delete(key))
  if (filters.district) params.set('district', filters.district)
  if (filters.mode !== 'all') params.set('mode', filters.mode)
  if (filters.search) params.set('search', filters.search)
  if (filters.route) params.set('route', filters.route)
  if (filters.onlyPavilion) {
    params.set('pavilion', '1')
    params.set('pavilionOnly', 'true')
  }
  return params
}
