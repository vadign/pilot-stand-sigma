import type { LiveSourceMode, SigmaDataType, SourceLoadStatus } from '../../live/types'

export type TransitMode = 'bus' | 'trolleybus' | 'tram' | 'minibus' | 'metro' | 'unknown'

export interface TransitRouteRef {
  id: string
  number: string
  mode: TransitMode
  raw: string
}

export interface TransitStop {
  id: string
  name: string
  district: string
  street: string
  hasPavilion: boolean
  routesRaw: string
  routesParsed: TransitRouteRef[]
  coordinates: [number, number] | null
  dataType: SigmaDataType
  source: string
  updatedAt: string
  raw: Record<string, string>
}

export interface TransportFare {
  id: string
  mode: TransitMode
  fareType: string
  amount: number
  currency: string
  validFrom?: string
  carrier?: string
  source: string
  updatedAt: string
  raw: Record<string, string>
}

export interface DistrictTransportMetrics {
  district: string
  stopCount: number
  uniqueRoutes: number
  pavilionShare: number
  richestStop?: TransitStop
  routesByMode: Record<TransitMode, number>
  transportInfrastructureIndex: number
}

export interface TransportRouteMetrics {
  routeId: string
  mode: TransitMode
  stopCount: number
  districtCount: number
  districts: string[]
  hubStops: TransitStop[]
}

export interface TransportSourceStatus {
  key: 'transport-stops' | 'transport-fares'
  datasetId: '49' | '51'
  title: string
  sourceUrl: string
  source: 'runtime' | 'snapshot' | 'cache' | 'mock'
  dataType: SigmaDataType
  status: SourceLoadStatus
  updatedAt?: string
  fetchedAt: string
  ttlHours: number
  message: string
}

export interface TransportRealtimeAvailability {
  available: boolean
  message: string
}

export interface PublicTransportBundle {
  mode: LiveSourceMode
  stops: TransitStop[]
  fares: TransportFare[]
  statuses: TransportSourceStatus[]
  realtime: TransportRealtimeAvailability
}

export interface PublicTransportFiltersValue {
  district: string
  mode: TransitMode | 'all'
  search: string
  route: string
  onlyPavilion: boolean
}
