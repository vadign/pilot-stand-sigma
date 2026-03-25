import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSchoolsCsv } from '../parsers/parseSchoolsCsv'
import { parseKindergartensCsv } from '../parsers/parseKindergartensCsv'
import { normalizeDistrict } from '../utils/normalizeDistrict'
import { clearGeocodeCache, geocodeAddress } from '../utils/geocodeAddress'
import { parseResidentialOsm } from '../parsers/parseResidentialOsm'
import { buildCoverageModel } from '../utils/buildCoverageModel'
import { buildDistrictEducationStats } from '../utils/buildDistrictEducationStats'
import { SchoolsProvider } from '../providers/SchoolsProvider'

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'src/features/schools-kindergartens/tests/fixtures', name), 'utf-8')

describe('schools-kindergartens', () => {
  it('parses dataset 28', () => {
    const rows = parseSchoolsCsv(fixture('schools.csv'), '2026-03-25T00:00:00.000Z', 'src')
    expect(rows).toHaveLength(1)
    expect(rows[0].coordinates?.origin).toBe('source-native')
  })

  it('parses dataset 27', () => {
    const rows = parseKindergartensCsv(fixture('kindergartens.csv'), '2026-03-25T00:00:00.000Z', 'src')
    expect(rows).toHaveLength(1)
    expect(rows[0].district).toBe('Центральный')
  })

  it('normalizes district', () => {
    expect(normalizeDistrict('Ленинский район')).toBe('Ленинский')
  })

  it('geocode cache hit and miss', async () => {
    clearGeocodeCache()
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [{ lat: '55', lon: '82' }] })) as unknown as typeof fetch
    const first = await geocodeAddress('Новосибирск, Ленина 1', fetchImpl)
    const second = await geocodeAddress('Новосибирск, Ленина 1', fetchImpl)
    expect(first?.origin).toBe('derived')
    expect(second?.lat).toBe(55)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('parses OSM residential objects', () => {
    const parsed = parseResidentialOsm(JSON.parse(fixture('osm.json')), '2026-03-25T00:00:00.000Z')
    expect(parsed.length).toBe(2)
  })

  it('builds nearest coverage assignments and zones', () => {
    const schools = parseSchoolsCsv(fixture('schools.csv'), '2026-03-25T00:00:00.000Z', 'src')
    const buildings = parseResidentialOsm(JSON.parse(fixture('osm.json')), '2026-03-25T00:00:00.000Z')
    const model = buildCoverageModel(schools, buildings, 'school', { mode: 'nearest', schoolRadiusMeters: 1200, kindergartenRadiusMeters: 700 })
    expect(model.assignments.length).toBeGreaterThan(0)
    expect(model.zones[0].coverageLabel).toContain('Approximate model')
  })

  it('builds district stats', () => {
    const schools = parseSchoolsCsv(fixture('schools.csv'), '2026-03-25T00:00:00.000Z', 'src')
    const kindergartens = parseKindergartensCsv(fixture('kindergartens.csv'), '2026-03-25T00:00:00.000Z', 'src')
    const buildings = parseResidentialOsm(JSON.parse(fixture('osm.json')), '2026-03-25T00:00:00.000Z')
    const stats = buildDistrictEducationStats(schools, kindergartens, buildings, [])
    expect(stats.length).toBeGreaterThan(0)
  })

  it('provider falls back when live unavailable', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch
    const provider = new SchoolsProvider(undefined, fetchImpl)
    const result = await provider.load('live')
    expect(result.status.dataType).toBe('mock-fallback')
  })
})
