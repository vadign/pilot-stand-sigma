import type { InstitutionCoordinates } from '../types'

const cache = new Map<string, InstitutionCoordinates | null>()

const base = 'https://nominatim.openstreetmap.org/search'

export const geocodeAddress = async (address: string, fetchImpl: typeof fetch = fetch): Promise<InstitutionCoordinates | null> => {
  const key = address.trim().toLowerCase()
  if (!key) return null
  if (cache.has(key)) return cache.get(key) ?? null

  try {
    const url = `${base}?format=json&limit=1&city=Новосибирск&q=${encodeURIComponent(address)}`
    const response = await fetchImpl(url, {
      headers: { 'Accept-Language': 'ru', 'User-Agent': 'sigma-education-module/1.0' },
    })
    if (!response.ok) throw new Error(`geocoding failed: ${response.status}`)
    const payload = await response.json() as Array<{ lat: string; lon: string }>
    const first = payload[0]
    const result = first
      ? { lat: Number(first.lat), lon: Number(first.lon), origin: 'derived' as const }
      : null
    cache.set(key, result)
    return result
  } catch {
    cache.set(key, null)
    return null
  }
}

export const clearGeocodeCache = () => cache.clear()
