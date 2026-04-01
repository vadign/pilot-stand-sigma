import { describe, expect, it } from 'vitest'
import { build051Snapshot, normalize051ToSigmaIncidents, summarize051Snapshot } from '../normalizers/normalize051ToSigma'

describe('normalize051ToSigmaIncidents', () => {
  it('adds a synthetic heating incident when the snapshot has no emergency heating or hot water events', () => {
    const snapshot = build051Snapshot({
      sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
      snapshotAt: '2026-03-20T09:30:00.000Z',
      fetchedAt: '2026-03-20T09:31:00.000Z',
      parseVersion: '1.0.0',
      planned: [{ district: 'Ленинский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
      emergency: [{ district: 'Кировский район', outageKind: 'emergency', utilityType: 'electricity', houses: 1 }],
    })

    const incidents = normalize051ToSigmaIncidents(snapshot)
    const summary = summarize051Snapshot(snapshot)
    const syntheticIncident = incidents.find((incident) => incident.id.includes('synthetic'))

    expect(syntheticIncident).toMatchObject({
      id: '051-len-synthetic-emergency-heating',
      utilityType: 'heating',
      outageKind: 'emergency',
      title: 'Демонстрационный инцидент: Экстренное отключение отопления',
    })
    expect(syntheticIncident?.summary).toContain('демонстрационный резерв')
    expect(summary.activeIncidents).toBe(3)
    expect(summary.utilities.some((item) => item.utilityType === 'heating' && item.emergencyHouses === 1)).toBe(true)
  })

  it('does not duplicate real heating incidents', () => {
    const snapshot = build051Snapshot({
      sourceUrl: 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
      snapshotAt: '2026-03-20T09:30:00.000Z',
      fetchedAt: '2026-03-20T09:31:00.000Z',
      parseVersion: '1.0.0',
      planned: [{ district: 'Ленинский район', outageKind: 'planned', utilityType: 'hot_water', houses: 2 }],
      emergency: [{ district: 'Советский район', outageKind: 'emergency', utilityType: 'heating', houses: 3 }],
    })

    const incidents = normalize051ToSigmaIncidents(snapshot)

    expect(incidents).toHaveLength(2)
    expect(incidents.some((incident) => incident.id.includes('synthetic'))).toBe(false)
  })
})
