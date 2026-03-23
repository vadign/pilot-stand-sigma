import type { SigmaIndicator } from '../types'

interface OpenMeteoPayload {
  latitude: number
  longitude: number
  hourly?: Record<string, Array<number | null> | string[]>
  current?: Record<string, number | null>
  current_units?: Record<string, string>
  current_weather_units?: Record<string, string>
}

const metricMap = [
  ['european_aqi', 'aqi', 'AQI'],
  ['pm2_5', 'pm25', 'PM2.5'],
  ['pm10', 'pm10', 'PM10'],
  ['nitrogen_dioxide', 'no2', 'NO₂'],
  ['temperature_2m', 'temperature', 'Температура'],
  ['wind_speed_10m', 'wind_speed', 'Ветер'],
  ['relative_humidity_2m', 'humidity', 'Влажность'],
] as const

export const parseOpenMeteoIndicators = (payload: OpenMeteoPayload, sourceId: string, updatedAt: string): SigmaIndicator[] => {
  const coordinates: [number, number] = [payload.latitude, payload.longitude]
  return metricMap.flatMap(([field, metric, label]) => {
    const valueFromCurrent = typeof payload.current?.[field] === 'number' ? payload.current?.[field] : undefined
    const hourlyValues = payload.hourly?.[field]
    const valueFromHourly = Array.isArray(hourlyValues) ? hourlyValues.find((item) => typeof item === 'number') : undefined
    const value = typeof valueFromCurrent === 'number' ? valueFromCurrent : typeof valueFromHourly === 'number' ? valueFromHourly : undefined
    if (value === undefined) return []
    const unit = payload.current_units?.[field] || payload.current_weather_units?.[field] || {
      european_aqi: 'индекс',
      pm2_5: 'µg/m³',
      pm10: 'µg/m³',
      nitrogen_dioxide: 'µg/m³',
      temperature_2m: '°C',
      wind_speed_10m: 'м/с',
      relative_humidity_2m: '%',
    }[field]
    return [{
      id: `${sourceId}-${metric}`,
      sourceId,
      direction: metric === 'wind_speed' ? 'roads' : 'ecology',
      label,
      metric,
      value: Number(value),
      unit,
      dataType: 'real',
      updatedAt,
      coordinates,
    } satisfies SigmaIndicator]
  })
}
