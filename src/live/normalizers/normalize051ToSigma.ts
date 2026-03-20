import { getDistrictId, getDistrictName } from '../../lib/districts'
import { districts } from '../../mocks/data'
import type { Power051Snapshot, Power051UtilityBucket, SigmaLiveOutageIncident, SigmaLiveOutageSummary } from '../types'
import { liveSeverityByOutageKind, liveStatusByOutageKind } from '../types'

const utilityLabels: Record<string, string> = {
  heating: 'отопление',
  hot_water: 'горячая вода',
  cold_water: 'холодная вода',
  sewer: 'водоотведение',
  electricity: 'электроснабжение',
  gas: 'газоснабжение',
}

const utilityToSubsystem: Record<string, string> = {
  heating: 'heat',
  hot_water: 'heat',
  cold_water: 'utilities',
  sewer: 'utilities',
  electricity: 'utilities',
  gas: 'utilities',
}

const buildUtilities = (snapshot: Pick<Power051Snapshot, 'planned' | 'emergency'>): Power051UtilityBucket[] => {
  const map = new Map<string, Power051UtilityBucket>()
  for (const item of [...snapshot.planned, ...snapshot.emergency]) {
    const bucket = map.get(item.utilityType) ?? { utilityType: item.utilityType, plannedHouses: 0, emergencyHouses: 0, incidents: 0 }
    if (item.outageKind === 'planned') bucket.plannedHouses += item.houses
    else bucket.emergencyHouses += item.houses
    bucket.incidents += 1
    map.set(item.utilityType, bucket)
  }
  return Array.from(map.values()).sort((left, right) => right.emergencyHouses + right.plannedHouses - left.emergencyHouses - left.plannedHouses)
}

export const build051Snapshot = (input: Omit<Power051Snapshot, 'utilities' | 'totals'>): Power051Snapshot => {
  const utilities = buildUtilities(input)
  const planned = input.planned.reduce((sum, item) => sum + item.houses, 0)
  const emergency = input.emergency.reduce((sum, item) => sum + item.houses, 0)
  return {
    ...input,
    utilities,
    totals: {
      houses: planned + emergency,
      planned,
      emergency,
      incidents: input.planned.length + input.emergency.length,
    },
  }
}

export const normalize051ToSigmaIncidents = (snapshot: Power051Snapshot): SigmaLiveOutageIncident[] => {
  const records = [...snapshot.emergency, ...snapshot.planned]
  return records.map((item, index) => {
    const districtId = getDistrictId(item.district)
    const district = districts.find((entry) => entry.id === districtId) ?? districts[0]
    const detectedAt = snapshot.snapshotAt
    const label = utilityLabels[item.utilityType] ?? item.utilityType
    return {
      id: `051-${district.id}-${item.outageKind}-${item.utilityType}-${index}`,
      liveSource: '051',
      liveIncidentId: `051-${district.id}-${item.outageKind}-${item.utilityType}-${index}`,
      utilityType: item.utilityType,
      outageKind: item.outageKind,
      level: 'district-level',
      sourceUrl: snapshot.sourceUrl,
      raw: item,
      sourceId: 'live-051',
      title: `${item.outageKind === 'emergency' ? 'Аварийное' : 'Плановое'} отключение: ${label}`,
      subsystem: utilityToSubsystem[item.utilityType] ?? 'utilities',
      severity: liveSeverityByOutageKind[item.outageKind],
      status: liveStatusByOutageKind[item.outageKind],
      district: district.id,
      coordinates: district.center,
      createdAt: detectedAt,
      detectedAt,
      summary: `${getDistrictName(district.id)} район · ${item.houses} домов · ${label}`,
      description: item.description ?? `${getDistrictName(district.id)} район, ресурс: ${label}.`,
      metrics: [
        { label: 'Отключено домов', value: String(item.houses), type: 'real' },
        { label: 'Тип отключения', value: item.outageKind === 'emergency' ? 'аварийное' : 'плановое', type: 'real' },
        { label: 'Уровень детализации', value: 'район', type: 'real' },
      ],
      affectedPopulation: item.houses * 3,
      linkedRegulationIds: item.utilityType === 'heating' || item.utilityType === 'hot_water' ? ['reg-heat'] : ['reg-utilities'],
      recommendations: [
        {
          id: `rec-${index}`,
          title: 'Базовый workflow Sigma',
          sourceId: 'live-051',
          steps: [
            { id: `step-${index}-1`, title: 'Подтвердить район и контур отключения', done: true },
            { id: `step-${index}-2`, title: 'Назначить ответственную службу', done: false },
            { id: `step-${index}-3`, title: 'Сообщить ожидаемое время восстановления', done: false },
          ],
        },
      ],
      assignee: item.outageKind === 'emergency' ? 'ЕДДС / аварийная служба' : 'Плановые работы ЖКХ',
      deadline: item.recoveryTime ? new Date().toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      progress: item.outageKind === 'emergency' ? 20 : 10,
      timeline: [
        { id: `tl-${index}-1`, at: detectedAt, author: '051', text: `Опубликовано отключение уровня района: ${label}.` },
      ],
      detail: {
        houses: item.houses,
        reason: item.reason,
        recoveryTime: item.recoveryTime,
        description: item.description,
      },
    }
  })
}

export const summarize051Snapshot = (snapshot: Power051Snapshot, previousSnapshot?: Power051Snapshot): SigmaLiveOutageSummary => {
  const districtMap = new Map<string, { district: string; districtId?: string; houses: number; incidents: number }>()
  for (const item of [...snapshot.planned, ...snapshot.emergency]) {
    const districtId = getDistrictId(item.district)
    const key = districtId ?? item.district
    const current = districtMap.get(key) ?? { district: getDistrictName(districtId ?? item.district), districtId, houses: 0, incidents: 0 }
    current.houses += item.houses
    current.incidents += 1
    districtMap.set(key, current)
  }

  return {
    totalHouses: snapshot.totals.houses,
    plannedHouses: snapshot.totals.planned,
    emergencyHouses: snapshot.totals.emergency,
    activeIncidents: snapshot.totals.incidents,
    topDistricts: Array.from(districtMap.values()).sort((left, right) => right.houses - left.houses).slice(0, 5),
    utilities: snapshot.utilities,
    delta: previousSnapshot ? {
      houses: snapshot.totals.houses - previousSnapshot.totals.houses,
      planned: snapshot.totals.planned - previousSnapshot.totals.planned,
      emergency: snapshot.totals.emergency - previousSnapshot.totals.emergency,
      incidents: snapshot.totals.incidents - previousSnapshot.totals.incidents,
    } : undefined,
  }
}
