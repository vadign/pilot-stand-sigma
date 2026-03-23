import type { DataType, Incident, IncidentStatus, Severity } from '../types'

export type LiveSourceMode = 'mock' | 'hybrid' | 'live'
export type LiveSourceKey = '051' | 'opendata'
export type SigmaDataType = DataType | 'mock-fallback'
export type UtilityType = 'hot_water' | 'cold_water' | 'sewer' | 'electricity' | 'gas' | 'heating'
export type OutageKind = 'planned' | 'emergency'
export type SourceLoadStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error'
export type SigmaSourceKind = 'api' | 'html' | 'csv' | 'overpass' | 'derived' | 'static'
export type SigmaRefreshMode = 'runtime' | 'snapshot' | 'manual' | 'hybrid'
export type SigmaSourceOrigin = 'runtime' | 'snapshot' | 'cache' | 'mock'
export type SigmaSourceDataCategory = 'real' | 'calculated' | 'reference' | 'simulation'
export type SigmaDomainDirection =
  | 'utilities'
  | 'roads'
  | 'ecology'
  | 'noise'
  | 'medical'
  | 'construction'
  | 'transport'
  | 'education'
  | 'social'
  | 'culture'
  | 'sport'
  | 'safety'
  | 'city-services'

export interface SigmaSourceRegistryEntry {
  id: string
  name: string
  kind: SigmaSourceKind
  ttlMs: number
  sourceUrls: string[]
  license: string
  refreshMode: SigmaRefreshMode
  dataCategory: SigmaSourceDataCategory
  supportsHistory: boolean
  supportsMap: boolean
  supportsAskSigma: boolean
  status: SourceLoadStatus
  lastUpdated?: string
  lastSuccess?: string
  lastError?: string
  enabled: boolean
  directions: SigmaDomainDirection[]
}

export interface SigmaSourceStatus extends SigmaSourceRegistryEntry {
  origin: SigmaSourceOrigin
  message: string
  rowCount?: number
  objectCount?: number
  parseVersion?: string
  freshnessLabel?: string
}

export type SourceStatusCard = SigmaSourceStatus

export interface SigmaIndicator {
  id: string
  sourceId: string
  direction: SigmaDomainDirection
  districtId?: string
  districtName?: string
  label: string
  metric: 'aqi' | 'pm25' | 'pm10' | 'no2' | 'temperature' | 'wind_speed' | 'humidity' | 'traffic_index'
  value: number
  unit: string
  dataType: SigmaDataType
  updatedAt: string
  coordinates?: [number, number]
  quality?: 'high' | 'medium' | 'fallback'
}

export interface SigmaReferenceObject {
  id: string
  sourceId: string
  direction: SigmaDomainDirection
  category: 'camera' | 'medical' | 'stop' | 'school' | 'kindergarten' | 'library' | 'pharmacy' | 'sport_ground' | 'sport_org' | 'culture' | 'parking'
  title: string
  address?: string
  districtId?: string
  districtName?: string
  coordinates: [number, number]
  metadata?: Record<string, string | number | boolean>
  dataType: SigmaDataType
  updatedAt: string
}

export interface SigmaDistrictBoundary {
  id: string
  name: string
  polygon: [number, number][]
  centroid: [number, number]
  quality: 'polygon' | 'centroid-fallback'
  sourceId: string
  updatedAt: string
}

export interface SigmaRiskCard {
  id: string
  title: string
  direction: SigmaDomainDirection
  severity: Severity
  districtId?: string
  districtName?: string
  sourceIds: string[]
  dataType: SigmaDataType
  triggeredAt: string
  explanation: {
    ruleId: string
    title: string
    because: string[]
  }
  metrics: Array<{ label: string; value: string }>
}

export interface SigmaTransitRoute {
  id: string
  fromDistrictId: string
  toDistrictId: string
  summary: string
  stopIds: string[]
  commonRouteNames: string[]
  score: number
  sourceId: string
  updatedAt: string
}

export interface SigmaConstructionObject {
  id: string
  kadNom: string
  title: string
  address: string
  developer: string
  districtId?: string
  districtName?: string
  status: 'active' | 'commissioned'
  coordinates?: [number, number]
  sourceId: string
  updatedAt: string
}

export interface SigmaConstructionAggregate {
  districtId?: string
  districtName: string
  permits: number
  commissioned: number
  activeConstruction: number
}

export interface SigmaTrafficIndex {
  id: string
  districtId?: string
  districtName?: string
  score: number
  level: 'low' | 'medium' | 'high' | 'extreme'
  factors: Array<{ label: string; value: number | string }>
  dataType: SigmaDataType
  sourceId: string
  updatedAt: string
}

export interface Power051DistrictStat {
  district: string
  districtId?: string
  utilityType: UtilityType
  outageKind: OutageKind
  houses: number
  reason?: string
  recoveryTime?: string
  description?: string
}

export interface Power051UtilityBucket {
  utilityType: UtilityType
  plannedHouses: number
  emergencyHouses: number
  incidents: number
}

export interface Power051Snapshot {
  sourceUrl: string
  snapshotAt: string
  fetchedAt: string
  parseVersion: string
  rawHash?: string
  planned: Power051DistrictStat[]
  emergency: Power051DistrictStat[]
  utilities: Power051UtilityBucket[]
  totals: {
    houses: number
    planned: number
    emergency: number
    incidents: number
  }
}

export interface SigmaLiveOutageIncident extends Incident {
  liveSource: '051'
  liveIncidentId: string
  utilityType: UtilityType
  outageKind: OutageKind
  level: 'district-level'
  sourceUrl: string
  detail?: {
    houses: number
    reason?: string
    recoveryTime?: string
    description?: string
  }
  raw: Power051DistrictStat
}

export interface SigmaLiveOutageSummary {
  totalHouses: number
  plannedHouses: number
  emergencyHouses: number
  activeIncidents: number
  topDistricts: Array<{ district: string; districtId?: string; houses: number; incidents: number }>
  utilities: Power051UtilityBucket[]
  delta?: {
    houses: number
    planned: number
    emergency: number
    incidents: number
  }
}

export interface OpendataDatasetMeta {
  id: string
  title: string
  passportUrl: string
  csvUrl?: string
  updatedAt?: string
  fetchedAt: string
  rows: number
  ttlMinutes: number
}

export interface ConstructionPermitRecord {
  id: string
  NomRazr: string
  DatRazr: string
  Zastr: string
  NameOb: string
  AdrOr: string
  KadNom: string
  districtId?: string
  districtName?: string
  raw: Record<string, string>
}

export interface ConstructionCommissionedRecord {
  id: string
  NomRazr: string
  DatRazr: string
  Zastr: string
  NameOb: string
  Raion: string
  AdrOb: string
  KadNom: string
  districtId?: string
  districtName?: string
  raw: Record<string, string>
}

export interface ConstructionActiveRecord {
  id: string
  KadNom: string
  permit?: ConstructionPermitRecord
  commissioned?: ConstructionCommissionedRecord
  status: 'active' | 'commissioned_without_permit'
  districtId?: string
  districtName?: string
  address: string
  developer: string
  objectName: string
}

export interface DistrictConstructionAggregate {
  districtId?: string
  districtName: string
  permits: number
  commissioned: number
  activeConstruction: number
}

export interface ConstructionDatasetBundle {
  permitsMeta: OpendataDatasetMeta
  commissionedMeta: OpendataDatasetMeta
  permits: ConstructionPermitRecord[]
  commissioned: ConstructionCommissionedRecord[]
  active: ConstructionActiveRecord[]
  aggregates: DistrictConstructionAggregate[]
}

export interface LiveManifestRecord {
  key: string
  title: string
  path: string
  updatedAt: string
  fetchedAt: string
  ttlMinutes: number
  sourceUrl: string
  type: SigmaDataType
  status: 'ready' | 'stale' | 'error'
  historyPath?: string
  meta?: Record<string, string | number | boolean>
}

export interface LiveManifest {
  generatedAt: string
  parseVersion: string
  records: LiveManifestRecord[]
}

export interface CachedLiveEntry<T> {
  key: string
  payload: T
  fetchedAt: string
  expiresAt: string
  sourceUrl: string
  etag?: string
  lastModified?: string
  parseVersion: string
  errorState?: string
}

export interface LiveSourceResult<T> {
  payload: T
  meta: {
    source: SigmaSourceOrigin
    type: SigmaDataType
    fetchedAt: string
    updatedAt?: string
    sourceUrl: string
    status: SourceLoadStatus
    message: string
  }
}

export interface SigmaLiveDomainBundle {
  indicators: SigmaIndicator[]
  referenceObjects: SigmaReferenceObject[]
  districtBoundaries: SigmaDistrictBoundary[]
  riskCards: SigmaRiskCard[]
  transitRoutes: SigmaTransitRoute[]
  constructionObjects: SigmaConstructionObject[]
  trafficIndex: SigmaTrafficIndex[]
}

export interface LiveBundle {
  mode: LiveSourceMode
  outages: LiveSourceResult<{ snapshot: Power051Snapshot; summary: SigmaLiveOutageSummary; incidents: SigmaLiveOutageIncident[]; history: Power051Snapshot[] }>
  construction: LiveSourceResult<ConstructionDatasetBundle>
  domain: SigmaLiveDomainBundle
  sourceStatuses: SigmaSourceStatus[]
}

export interface LiveWorkflowEntry {
  id: string
  incidentId: string
  action: 'assign' | 'escalate' | 'take' | 'comment'
  text: string
  author: string
  at: string
}

export interface SigmaLiveState {
  mode: LiveSourceMode
  isBootstrapping: boolean
  outages?: LiveBundle['outages']
  construction?: LiveBundle['construction']
  sourceStatuses: SigmaSourceStatus[]
  liveIncidents: SigmaLiveOutageIncident[]
  liveHistory: Power051Snapshot[]
  workflow: Record<string, LiveWorkflowEntry[]>
  indicators: SigmaIndicator[]
  referenceObjects: SigmaReferenceObject[]
  districtBoundaries: SigmaDistrictBoundary[]
  riskCards: SigmaRiskCard[]
  transitRoutes: SigmaTransitRoute[]
  constructionObjects: SigmaConstructionObject[]
  trafficIndex: SigmaTrafficIndex[]
  lastError?: string
}

export interface SourceRegistryEntry {
  key: LiveSourceKey
  title: string
  sourceUrl: string
  snapshotPath: string
  ttlMinutes: number
}

export interface LiveIncidentView extends Incident {
  sourceKind: 'mock' | 'live'
  sourceBadge: string
  dataType: SigmaDataType
  sourceUpdatedAt?: string
  statusHint?: string
  canArchive: boolean
  canResolve: boolean
  liveMeta?: SigmaLiveOutageIncident
  workflowEntries?: LiveWorkflowEntry[]
}

export const liveSeverityByOutageKind: Record<OutageKind, Severity> = {
  emergency: 'критический',
  planned: 'средний',
}

export const liveStatusByOutageKind: Record<OutageKind, IncidentStatus> = {
  emergency: 'эскалирован',
  planned: 'новый',
}
