import type { DataType, Incident, IncidentStatus, Severity } from '../types'

export type LiveSourceMode = 'mock' | 'hybrid' | 'live'
export type LiveSourceKey = '051' | 'opendata'
export type SigmaDataType = DataType | 'mock-fallback'
export type UtilityType = 'hot_water' | 'cold_water' | 'sewer' | 'electricity' | 'gas' | 'heating'
export type OutageKind = 'planned' | 'emergency'
export type SourceLoadStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error'

export interface SourceStatusCard {
  key: LiveSourceKey
  title: string
  sourceUrl: string
  updatedAt?: string
  fetchedAt?: string
  ttlMinutes: number
  status: SourceLoadStatus
  type: SigmaDataType
  message: string
  source: 'runtime' | 'snapshot' | 'cache' | 'mock'
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
    source: 'runtime' | 'snapshot' | 'cache' | 'mock'
    type: SigmaDataType
    fetchedAt: string
    updatedAt?: string
    sourceUrl: string
    status: SourceLoadStatus
    message: string
  }
}

export interface LiveBundle {
  mode: LiveSourceMode
  outages: LiveSourceResult<{ snapshot: Power051Snapshot; summary: SigmaLiveOutageSummary; incidents: SigmaLiveOutageIncident[]; history: Power051Snapshot[] }>
  construction: LiveSourceResult<ConstructionDatasetBundle>
  sourceStatuses: SourceStatusCard[]
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
  sourceStatuses: SourceStatusCard[]
  liveIncidents: SigmaLiveOutageIncident[]
  liveHistory: Power051Snapshot[]
  workflow: Record<string, LiveWorkflowEntry[]>
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
