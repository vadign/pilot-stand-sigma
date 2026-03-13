export type DataType = 'real' | 'calculated' | 'simulation' | 'pilot'
export type Severity = 'низкий' | 'средний' | 'высокий' | 'критический'
export type IncidentStatus = 'новый' | 'в работе' | 'эскалирован' | 'архив' | 'решен'

export interface District { id: string; name: string; center: [number, number] }
export interface Subsystem { id: string; title: string; color: string }
export interface DataSource { id: string; title: string; type: DataType; freshness: string; provider: string }
export interface KpiMetric { id: string; title: string; value: string; trend: number; sourceId: string; type: DataType; updatedAt: string }
export interface IncidentAction { id: string; title: string; done: boolean }
export interface IncidentTimelineItem { id: string; at: string; author: string; text: string }
export interface Recommendation { id: string; title: string; steps: IncidentAction[]; sourceId: string }
export interface Incident {
  id: string; title: string; subsystem: string; severity: Severity; status: IncidentStatus; district: string;
  coordinates: [number, number]; createdAt: string; detectedAt: string; sourceId: string; summary: string; description: string;
  metrics: { label: string; value: string; type: DataType }[]; affectedPopulation: number; linkedRegulationIds: string[];
  recommendations: Recommendation[]; assignee: string; deadline: string; progress: number; timeline: IncidentTimelineItem[]
}
export interface ExecutiveBrief { id: string; title: string; body: string; incidentIds: string[]; sourceId: string; type: DataType; updatedAt: string }
export interface Scenario { id: string; title: string; description: string; parameters: Record<string, number>; impacts: { label: string; value: number }[]; comparisonBaseline: string; serviceLoad: number; timelinePoints: { name: string; value: number }[] }
export interface ScenarioRun { id: string; scenarioId: string; at: string; status: 'выполняется' | 'готово'; projectedIncidents: number; expectedDelay: number; serviceLoad: number }
export interface Deputy { id: string; name: string; domain: string; mode: 'recommendation' | 'approval' | 'autonomous'; connectedSourceIds: string[]; activeIncidentIds: string[]; permissions: string[]; latestActions: string[]; constraints: string[]; escalationRate: number }
export interface Regulation { id: string; code: string; title: string; domain: string; version: string; status: string; sourceDocument: string; sourceClause: string; effectiveFrom: string; parameters: string[]; recommendationTemplates: string[]; coverageStatus: 'полное' | 'частичное' | 'нет'; linkedIncidentTypes: string[] }
export interface RegulationCoverage { domain: string; covered: number; uncovered: number }
export interface Notification { id: string; text: string; level: Severity; createdAt: string }
export interface ServicePerformance { id: string; service: string; resolvedInTime: number; avgMinutes: number; incidents: number }
