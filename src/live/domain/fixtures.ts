import { districts } from '../../mocks/data'
import type { SigmaDistrictBoundary, SigmaIndicator, SigmaReferenceObject } from '../types'

const now = '2026-03-22T08:00:00.000Z'

export const districtBoundariesFixture: SigmaDistrictBoundary[] = districts.map((district, index) => {
  const [lat, lng] = district.center
  const spread = index === 5 ? 0.022 : 0.018
  return {
    id: district.id,
    name: district.name,
    centroid: district.center,
    polygon: [
      [lat - spread, lng - spread],
      [lat - spread, lng + spread],
      [lat + spread, lng + spread],
      [lat + spread, lng - spread],
    ],
    quality: 'polygon',
    sourceId: 'source-osm-boundaries',
    updatedAt: now,
  }
})

export const airIndicatorFixture: SigmaIndicator[] = [
  { id: 'aqi-city', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'AQI', metric: 'aqi', value: 78, unit: 'индекс', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
  { id: 'pm25-city', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'PM2.5', metric: 'pm25', value: 38, unit: 'µg/m³', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
  { id: 'pm10-city', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'PM10', metric: 'pm10', value: 54, unit: 'µg/m³', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
  { id: 'no2-city', sourceId: 'source-openmeteo-air', direction: 'ecology', label: 'NO₂', metric: 'no2', value: 31, unit: 'µg/m³', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
]

export const weatherIndicatorFixture: SigmaIndicator[] = [
  { id: 'temp-city', sourceId: 'source-openmeteo-weather', direction: 'ecology', label: 'Температура', metric: 'temperature', value: -14, unit: '°C', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
  { id: 'wind-city', sourceId: 'source-openmeteo-weather', direction: 'roads', label: 'Ветер', metric: 'wind_speed', value: 1.8, unit: 'м/с', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
  { id: 'humidity-city', sourceId: 'source-openmeteo-weather', direction: 'ecology', label: 'Влажность', metric: 'humidity', value: 88, unit: '%', dataType: 'real', updatedAt: now, coordinates: [55.028, 82.92] },
]

const ref = (id: string, sourceId: string, category: SigmaReferenceObject['category'], title: string, districtId: string, coordinates: [number, number], metadata?: SigmaReferenceObject['metadata']): SigmaReferenceObject => ({
  id,
  sourceId,
  category,
  title,
  direction: category === 'camera' ? 'safety' : category === 'medical' || category === 'pharmacy' ? 'medical' : category === 'stop' || category === 'parking' ? 'transport' : category === 'culture' || category === 'library' ? 'culture' : category === 'sport_ground' || category === 'sport_org' ? 'sport' : 'social',
  districtId,
  districtName: districts.find((item) => item.id === districtId)?.name,
  coordinates,
  address: `${districts.find((item) => item.id === districtId)?.name} район`,
  metadata,
  dataType: 'real',
  updatedAt: now,
})

export const referenceObjectsFixture: SigmaReferenceObject[] = [
  ref('camera-len-1', 'source-overpass-cameras', 'camera', 'Камера контроля скорости на Станиславского', 'len', [54.985, 82.887], { lanes: 4, enforcement: true }),
  ref('camera-kal-1', 'source-overpass-cameras', 'camera', 'Камера контроля полосы на Ипподромской', 'kal', [55.073, 82.98], { lanes: 6, enforcement: true }),
  ref('medical-oct-1', 'source-overpass-medical', 'medical', 'Городская клиническая больница №1', 'oct', [55.016, 82.975], { amenity: 'hospital' }),
  ref('medical-sov-1', 'source-overpass-medical', 'medical', 'Поликлиника Академгородка', 'sov', [54.865, 83.1], { amenity: 'clinic' }),
  ref('stop-sov-1', 'source-opendata-stops', 'stop', 'Цветной проезд', 'sov', [54.859, 83.106], { routes: '8, 15, 35' }),
  ref('stop-oct-1', 'source-opendata-stops', 'stop', 'Площадь Ленина', 'oct', [55.03, 82.92], { routes: '5, 13, 28' }),
  ref('school-sov-1', 'source-opendata-schools', 'school', 'Лицей Академический', 'sov', [54.862, 83.094]),
  ref('kind-sov-1', 'source-opendata-kindergartens', 'kindergarten', 'Детский сад №77', 'sov', [54.868, 83.088]),
  ref('lib-oct-1', 'source-opendata-libraries', 'library', 'Центральная библиотека', 'oct', [55.032, 82.917]),
  ref('pharm-len-1', 'source-opendata-pharmacies', 'pharmacy', 'Муниципальная аптека', 'len', [54.981, 82.884]),
  ref('sport-kal-1', 'source-opendata-sport-grounds', 'sport_ground', 'Спортплощадка Северная', 'kal', [55.072, 82.972]),
  ref('sportorg-kal-1', 'source-opendata-sport-orgs', 'sport_org', 'СШОР Калининского района', 'kal', [55.078, 82.971]),
  ref('culture-oct-1', 'source-opendata-culture', 'culture', 'Дом культуры Центр', 'oct', [55.026, 82.934]),
  ref('parking-oct-1', 'source-opendata-parking', 'parking', 'Муниципальная парковка у площади', 'oct', [55.03, 82.924], { capacity: 180 }),
]
