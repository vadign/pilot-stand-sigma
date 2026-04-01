import { getDistrictId, getDistrictName } from '../../lib/districts'
import { districts } from '../../mocks/data'
import { getOutageKindLabel } from '../outageKindLabels'
import { getOutageTitle, getUtilityLabel } from '../outagePresentation'
import type {
  Power051DistrictStat,
  Power051Snapshot,
  Power051UtilityBucket,
  SigmaLiveOutageIncident,
  SigmaLiveOutageSummary,
  UtilityType,
} from '../types'
import { liveSeverityByOutageKind, liveStatusByOutageKind } from '../types'

const utilityToSubsystem: Record<string, string> = {
  heating: 'heat',
  hot_water: 'heat',
  cold_water: 'utilities',
  sewer: 'utilities',
  electricity: 'utilities',
  gas: 'utilities',
}

const replayUtilityTypes = new Set<UtilityType>(['heating', 'hot_water'])
const fallbackReplayDistrictId = 'sov'
const syntheticReplayReason = 'Резервный демонстрационный инцидент Sigma'

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

const buildSnapshotInput = (
  snapshot: Power051Snapshot,
  patch: Pick<Power051Snapshot, 'planned' | 'emergency'>,
): Omit<Power051Snapshot, 'utilities' | 'totals'> => ({
  sourceUrl: snapshot.sourceUrl,
  snapshotAt: snapshot.snapshotAt,
  fetchedAt: snapshot.fetchedAt,
  parseVersion: snapshot.parseVersion,
  rawHash: snapshot.rawHash,
  planned: patch.planned,
  emergency: patch.emergency,
})

const pickFallbackDistrict = (records: Power051DistrictStat[]) => {
  const prioritizedRecords = records.filter((item) => replayUtilityTypes.has(item.utilityType))
  const sourceRecords = prioritizedRecords.length > 0 ? prioritizedRecords : records
  const district = districts.find((item) => item.id === fallbackReplayDistrictId) ?? districts[0]
  const fallbackLabel = `${district.name} район`

  if (sourceRecords.length === 0) {
    return { district, label: fallbackLabel }
  }

  const primaryRecord = [...sourceRecords].sort((left, right) => right.houses - left.houses)[0]
  const districtId = getDistrictId(primaryRecord?.district)
  const nextDistrict = districts.find((item) => item.id === districtId) ?? district
  return {
    district: nextDistrict,
    label: primaryRecord?.district || `${nextDistrict.name} район`,
  }
}

const createSyntheticReplayStat = (snapshot: Power051Snapshot): Power051DistrictStat => {
  const records = [...snapshot.planned, ...snapshot.emergency]
  const { district, label } = pickFallbackDistrict(records)
  return {
    district: label,
    districtId: district.id,
    utilityType: 'heating',
    outageKind: 'emergency',
    houses: 1,
    reason: syntheticReplayReason,
    description:
      'Сигма автоматически сформировала демонстрационный аварийный инцидент по отоплению, ' +
      'поскольку в текущем снимке 051 нет экстренных событий по отоплению и горячей воде.',
  }
}

export const ensureReplayCoverageSnapshot = (snapshot: Power051Snapshot): Power051Snapshot => {
  const emergencyReplayRecords = snapshot.emergency.filter((item) => replayUtilityTypes.has(item.utilityType))
  if (emergencyReplayRecords.length > 0) return snapshot

  return build051Snapshot(
    buildSnapshotInput(snapshot, {
      planned: snapshot.planned,
      emergency: [...snapshot.emergency, createSyntheticReplayStat(snapshot)],
    }),
  )
}

const isSyntheticReplayStat = (item: Power051DistrictStat): boolean =>
  item.reason === syntheticReplayReason

export const normalize051ToSigmaIncidents = (snapshot: Power051Snapshot): SigmaLiveOutageIncident[] => {
  const normalizedSnapshot = ensureReplayCoverageSnapshot(snapshot)
  const rawRecords = [...normalizedSnapshot.emergency, ...normalizedSnapshot.planned]

  return rawRecords.map((item, index) => {
    const synthetic = isSyntheticReplayStat(item)
    const districtId = getDistrictId(item.district)
    const district = districts.find((entry) => entry.id === districtId) ?? districts[0]
    const detectedAt = normalizedSnapshot.snapshotAt
    const label = getUtilityLabel(item.utilityType)
    const incidentId = synthetic
      ? `051-${district.id}-synthetic-${item.outageKind}-${item.utilityType}`
      : `051-${district.id}-${item.outageKind}-${item.utilityType}-${index}`

    return {
      id: incidentId,
      liveSource: '051',
      liveIncidentId: incidentId,
      utilityType: item.utilityType,
      outageKind: item.outageKind,
      level: 'district-level',
      sourceUrl: normalizedSnapshot.sourceUrl,
      raw: item,
      sourceId: synthetic ? 'live-051-demo' : 'live-051',
      title: synthetic
        ? `Демонстрационный инцидент: ${getOutageTitle(item.outageKind, item.utilityType)}`
        : getOutageTitle(item.outageKind, item.utilityType),
      subsystem: utilityToSubsystem[item.utilityType] ?? 'utilities',
      severity: liveSeverityByOutageKind[item.outageKind],
      status: liveStatusByOutageKind[item.outageKind],
      district: district.id,
      coordinates: district.center,
      createdAt: detectedAt,
      detectedAt,
      summary: synthetic
        ? `${getDistrictName(district.id)} район · демонстрационный резерв по ${label}`
        : `${getDistrictName(district.id)} район · ${item.houses} домов · ${label}`,
      description: synthetic
        ? item.description ?? 'Сигма автоматически сформировала демонстрационный аварийный инцидент по отоплению.'
        : item.description ?? `${getDistrictName(district.id)} район, ресурс: ${label}.`,
      metrics: [
        { label: synthetic ? 'Демонстрационных домов' : 'Отключено домов', value: String(item.houses), type: 'real' },
        { label: 'Тип отключения', value: getOutageKindLabel(item.outageKind, 'singular'), type: 'real' },
        { label: 'Уровень детализации', value: synthetic ? 'демонстрационный районный резерв' : 'район', type: 'real' },
      ],
      affectedPopulation: item.houses * 3,
      linkedRegulationIds: item.utilityType === 'heating' || item.utilityType === 'hot_water' ? ['reg-heat'] : ['reg-utilities'],
      recommendations: [
        {
          id: synthetic ? `rec-synthetic-${district.id}` : `rec-${index}`,
          title: synthetic ? 'Проверка демонстрационного сценария' : 'Базовый рабочий процесс Сигмы',
          sourceId: synthetic ? 'live-051-demo' : 'live-051',
          steps: [
            { id: `step-${index}-1`, title: synthetic ? 'Подтвердить демонстрационный районный контур' : 'Подтвердить район и контур отключения', done: true },
            { id: `step-${index}-2`, title: synthetic ? 'Показать воспроизведение и прогноз' : 'Назначить ответственную службу', done: false },
            { id: `step-${index}-3`, title: synthetic ? 'Вернуться к реальным событиям 051 после демонстрации' : 'Сообщить ожидаемое время восстановления', done: false },
          ],
        },
      ],
      assignee: synthetic
        ? 'Сигма / демонстрационный резерв'
        : item.outageKind === 'emergency'
          ? 'ЕДДС / экстренная служба'
          : 'Запланированные работы ЖКХ',
      deadline: item.recoveryTime ? new Date().toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      progress: synthetic ? 5 : item.outageKind === 'emergency' ? 20 : 10,
      timeline: [
        {
          id: synthetic ? `tl-synthetic-${district.id}` : `tl-${index}-1`,
          at: detectedAt,
          author: synthetic ? 'Сигма' : '051',
          text: synthetic
            ? 'Сформирован демонстрационный инцидент по отоплению из-за отсутствия событий по отоплению и горячей воде в текущем снимке 051.'
            : `Опубликовано отключение уровня района: ${label}.`,
        },
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
  const normalizedSnapshot = ensureReplayCoverageSnapshot(snapshot)
  const normalizedPreviousSnapshot = previousSnapshot ? ensureReplayCoverageSnapshot(previousSnapshot) : undefined
  const districtMap = new Map<string, { district: string; districtId?: string; houses: number; incidents: number }>()
  for (const item of [...normalizedSnapshot.planned, ...normalizedSnapshot.emergency]) {
    const districtId = getDistrictId(item.district)
    const key = districtId ?? item.district
    const current = districtMap.get(key) ?? { district: getDistrictName(districtId ?? item.district), districtId, houses: 0, incidents: 0 }
    current.houses += item.houses
    current.incidents += 1
    districtMap.set(key, current)
  }

  return {
    totalHouses: normalizedSnapshot.totals.houses,
    plannedHouses: normalizedSnapshot.totals.planned,
    emergencyHouses: normalizedSnapshot.totals.emergency,
    activeIncidents: normalizedSnapshot.totals.incidents,
    topDistricts: Array.from(districtMap.values()).sort((left, right) => right.houses - left.houses).slice(0, 5),
    utilities: normalizedSnapshot.utilities,
    delta: normalizedPreviousSnapshot ? {
      houses: normalizedSnapshot.totals.houses - normalizedPreviousSnapshot.totals.houses,
      planned: normalizedSnapshot.totals.planned - normalizedPreviousSnapshot.totals.planned,
      emergency: normalizedSnapshot.totals.emergency - normalizedPreviousSnapshot.totals.emergency,
      incidents: normalizedSnapshot.totals.incidents - normalizedPreviousSnapshot.totals.incidents,
    } : undefined,
  }
}
