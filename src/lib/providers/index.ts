import { incidents, regulations } from '../../mocks/data'
export interface IncidentProvider { listIncidents(): Promise<unknown[]> }
export class MockIncidentProvider implements IncidentProvider { async listIncidents(){ return incidents } }
export class MockWeatherProvider { async getSnapshot(){ return { temp: -12, wind: 5 } } }
export class MockAirProvider { async getAqi(){ return { aqi: 62 } } }
export class MockTrafficProvider { async getLoad(){ return { load: 71 } } }
export class MockRegulationProvider { async list(){ return regulations } }
export interface Power051Provider { pullTelemetry(): Promise<unknown> }
export interface OpenMeteoProvider { forecast(): Promise<unknown> }
export interface OverpassCameraProvider { cameras(): Promise<unknown> }
export interface MunicipalOpenDataProvider { datasets(): Promise<unknown> }
