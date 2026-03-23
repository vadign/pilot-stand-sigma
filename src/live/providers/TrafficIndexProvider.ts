import { getDistrictName } from '../../lib/districts'
import type { SigmaIndicator, SigmaTrafficIndex } from '../types'

const holidayDates = new Set(['2026-01-01', '2026-01-07', '2026-02-23', '2026-03-08'])

export const computeTrafficIndex = ({
  now,
  districtIds,
  indicators,
}: {
  now: Date
  districtIds: string[]
  indicators: SigmaIndicator[]
}): SigmaTrafficIndex[] => {
  const hour = now.getUTCHours() + 7
  const localHour = ((hour % 24) + 24) % 24
  const day = now.getUTCDay()
  const isWeekend = day === 0 || day === 6
  const localDate = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const isHoliday = holidayDates.has(localDate)
  const temp = indicators.find((item) => item.metric === 'temperature')?.value ?? 0
  const wind = indicators.find((item) => item.metric === 'wind_speed')?.value ?? 4
  const pm25 = indicators.find((item) => item.metric === 'pm25')?.value ?? 12

  const peakFactor = localHour >= 7 && localHour <= 10 ? 24 : localHour >= 17 && localHour <= 20 ? 28 : localHour >= 11 && localHour <= 16 ? 12 : 6
  const weekFactor = isWeekend ? -8 : 10
  const holidayFactor = isHoliday ? -12 : 0
  const weatherFactor = temp <= -20 ? 14 : temp <= -10 ? 8 : 0
  const windFactor = wind < 2 ? 6 : 0
  const ecoFactor = pm25 > 35 ? 8 : 0
  const base = Math.max(12, Math.min(95, 24 + peakFactor + weekFactor + holidayFactor + weatherFactor + windFactor + ecoFactor))

  return districtIds.map((districtId, index) => {
    const score = Math.max(10, Math.min(99, base + (index % 4) * 3 - (districtId === 'sov' ? 2 : 0)))
    const level = score >= 85 ? 'extreme' : score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low'
    return {
      id: `traffic-${districtId}`,
      districtId,
      districtName: getDistrictName(districtId),
      score,
      level,
      factors: [
        { label: 'hour', value: localHour },
        { label: 'weekday', value: isWeekend ? 'weekend' : 'workday' },
        { label: 'holiday', value: isHoliday ? 1 : 0 },
        { label: 'temperature', value: temp },
        { label: 'wind_speed', value: wind },
        { label: 'pm25', value: pm25 },
      ],
      dataType: 'calculated',
      sourceId: 'source-traffic-index',
      updatedAt: now.toISOString(),
    } satisfies SigmaTrafficIndex
  })
}

export class TrafficIndexProvider {
  build(indicators: SigmaIndicator[], districtIds: string[], now = new Date()): SigmaTrafficIndex[] {
    return computeTrafficIndex({ now, districtIds, indicators })
  }
}
