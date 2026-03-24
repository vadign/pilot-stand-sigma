import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse051OffPage } from '../parsers/parse051OffPage'
import { parseCsvDataset } from '../parsers/parseCsvDataset'
import { parseOpendataPassport } from '../parsers/parseOpendataPassport'
import { calculateActiveConstruction, extractDistrictFromAddress, normalizeCommissionedRecord, normalizePermitRecord } from '../normalizers/normalizeConstructionToSigma'

const base = join(process.cwd(), 'src/live/tests/fixtures')

describe('parse051OffPage', () => {
  it('parses planned and emergency outage blocks', () => {
    const html = readFileSync(join(base, '051-off.html'), 'utf-8')
    const parsed = parse051OffPage(html)
    expect(parsed.planned).toHaveLength(3)
    expect(parsed.emergency).toHaveLength(3)
    expect(parsed.emergency[0]?.outageKind).toBe('emergency')
  })

  it('parses district breakdown and utility types', () => {
    const html = readFileSync(join(base, '051-off.html'), 'utf-8')
    const parsed = parse051OffPage(html)
    expect(parsed.planned[0]?.district).toContain('Ленинский')
    expect(parsed.planned[0]?.utilityType).toBe('hot_water')
    expect(parsed.emergency[1]?.utilityType).toBe('heating')
  })

  it('gracefully degrades when a section is missing', () => {
    const html = '<html><body><div>20.03.2026 10:00</div><ul><li>Аварийные отключения Кировский район Холодная вода 3 дома</li></ul></body></html>'
    const parsed = parse051OffPage(html)
    expect(parsed.planned).toHaveLength(0)
    expect(parsed.emergency.length).toBeGreaterThanOrEqual(1)
  })
})

describe('opendata parsers', () => {
  it('parses passport html', () => {
    const html = readFileSync(join(base, 'opendata-passport-124.html'), 'utf-8')
    const parsed = parseOpendataPassport(html, 'https://opendata.novo-sibirsk.ru')
    expect(parsed.title).toContain('Разрешения')
    expect(parsed.csvUrl).toContain('/datasets/124.csv')
  })

  it('computes active construction by cadastral number', () => {
    const permitsCsv = readFileSync(join(base, 'opendata-124.csv'), 'utf-8')
    const commissionedCsv = readFileSync(join(base, 'opendata-125.csv'), 'utf-8')
    const permits = parseCsvDataset<Record<string, string>>(permitsCsv).map(normalizePermitRecord)
    const commissioned = parseCsvDataset<Record<string, string>>(commissionedCsv).map(normalizeCommissionedRecord)
    const active = calculateActiveConstruction(permits, commissioned)
    expect(active.some((item) => item.KadNom === '54:35:091230:100')).toBe(true)
    expect(active.some((item) => item.KadNom === '54:35:062500:201' && item.status === 'active')).toBe(false)
  })

  it('extracts district from address fallback', () => {
    const district = extractDistrictFromAddress('Академгородок, пр. Лаврентьева, 12')
    expect(district.districtId).toBe('sov')
  })
})
