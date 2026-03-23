import { parseCsvDataset } from '../../../live/parsers/parseCsvDataset'
import { parseRoutes } from '../utils/parseRoutes'
import type { TransitStop } from '../types'

const coordinateAliases = {
  lat: ['lat', 'latitude', 'широта', 'y', 'coordy', 'wgs84_latitude'],
  lon: ['lon', 'lng', 'longitude', 'долгота', 'x', 'coordx', 'wgs84_longitude'],
}

const getField = (row: Record<string, string>, aliases: string[]): string => {
  const lowerMap = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]))
  return aliases.map((alias) => lowerMap[alias.toLowerCase()]).find((value) => value !== undefined)?.trim() ?? ''
}

const parseBoolean = (value: string): boolean => /^(да|есть|1|true|имеется|павильон)$/i.test(value.trim())

const parseCoordinate = (row: Record<string, string>, type: 'lat' | 'lon'): number | undefined => {
  const raw = getField(row, coordinateAliases[type]).replace(',', '.').trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const parseStopsCsv = (csvText: string, updatedAt = new Date().toISOString(), source = 'opendata.novo-sibirsk.ru'): TransitStop[] => {
  const rows = parseCsvDataset<Record<string, string>>(csvText)

  return rows.map((row, index) => {
    const lat = parseCoordinate(row, 'lat')
    const lon = parseCoordinate(row, 'lon')
    const rawId = row.ID ?? row.Id ?? row.id ?? `${row.OstName ?? 'stop'}-${index + 1}`
    const routesRaw = row.Marshryt ?? row.Marshryt ?? row.routes ?? ''

    return {
      id: String(rawId).trim() || `stop-${index + 1}`,
      name: (row.OstName ?? row.Name ?? '').trim(),
      district: (row.AdrDistr ?? row.District ?? '').trim(),
      street: (row.AdrStreet ?? row.Address ?? '').trim(),
      hasPavilion: parseBoolean(row.Pavilion ?? row.HasPavilion ?? ''),
      routesRaw,
      routesParsed: parseRoutes(routesRaw),
      coordinates: lat !== undefined && lon !== undefined ? [lat, lon] : null,
      dataType: 'real',
      source,
      updatedAt,
      raw: row,
    }
  })
}
