import type { TransitMode, TransitRouteRef } from '../types'

const sectionModeMap: Array<{ pattern: RegExp; mode: TransitMode }> = [
  { pattern: /автобус/i, mode: 'bus' },
  { pattern: /троллейбус/i, mode: 'trolleybus' },
  { pattern: /трамвай/i, mode: 'tram' },
  { pattern: /маршрутное\s+такси|маршрутк/i, mode: 'minibus' },
  { pattern: /метро/i, mode: 'metro' },
]

const sectionRegex = /(Автобус|Троллейбус|Трамвай|Маршрутное\s+такси|Маршрутка|Метро)\s*:/gi
const routeTokenRegex = /[A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9/-]*/g
const ignoredTokens = new Set(['и', 'маршрут', 'маршруты', 'нет', 'отсутствует'])

export const inferTransitMode = (value: string): TransitMode => {
  const normalized = value.trim().toLowerCase()
  return sectionModeMap.find((entry) => entry.pattern.test(normalized))?.mode ?? 'unknown'
}

const extractRouteTokens = (value: string): string[] => {
  const matches = value.match(routeTokenRegex) ?? []
  return matches
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !ignoredTokens.has(token.toLowerCase()))
    .filter((token) => /\d/.test(token))
}

export const parseRoutes = (routesRaw: string): TransitRouteRef[] => {
  const normalized = routesRaw.replace(/\r/g, '\n').replace(/[•]/g, ';').trim()
  if (!normalized) return []

  const sections = Array.from(normalized.matchAll(sectionRegex))
  const routeRefs: TransitRouteRef[] = []

  if (sections.length === 0) {
    return Array.from(new Set(extractRouteTokens(normalized))).map((number) => ({
      id: `unknown:${number}`,
      number,
      mode: 'unknown',
      raw: number,
    }))
  }

  for (let index = 0; index < sections.length; index += 1) {
    const current = sections[index]
    const next = sections[index + 1]
    const label = current[1] ?? ''
    const start = current.index ?? 0
    const contentStart = start + current[0].length
    const contentEnd = next?.index ?? normalized.length
    const content = normalized.slice(contentStart, contentEnd).replace(/^[\s.;,-]+|[\s.;,-]+$/g, '')
    const mode = inferTransitMode(label)
    const tokens = Array.from(new Set(extractRouteTokens(content)))

    for (const number of tokens) {
      routeRefs.push({
        id: `${mode}:${number}`,
        number,
        mode,
        raw: `${label}: ${number}`,
      })
    }
  }

  return routeRefs.filter((route, index, list) => list.findIndex((item) => item.id === route.id) === index)
}
