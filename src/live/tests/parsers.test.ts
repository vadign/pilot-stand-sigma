import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse051OffPage } from '../parsers/parse051OffPage'
import { buildPower051SnapshotFromArcGis } from '../providers/power051ArcGis'

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

describe('ArcGIS official fallbacks', () => {
  it('builds 051 snapshot from ArcGIS outages', () => {
    const snapshot = buildPower051SnapshotFromArcGis({
      count: 2,
      features: [
        { attributes: { district_name: 'Ленинский район', type_id: 'Плановое', system_id: 1, geocoded_address: 'улица Крашенинникова, 1', description: 'Ремонт', end_date: 1774432800000 } },
        { attributes: { district_name: 'Ленинский район', type_id: 'Плановое', system_id: 1, geocoded_address: 'улица Крашенинникова, 3', description: 'Ремонт', end_date: 1774432800000 } },
      ],
    }, { fetchedAt: '2026-03-25T00:00:00.000Z' })

    expect(snapshot.planned).toHaveLength(1)
    expect(snapshot.planned[0]?.houses).toBe(2)
  })
})
