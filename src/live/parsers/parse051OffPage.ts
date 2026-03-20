import type { OutageKind, Power051DistrictStat, UtilityType } from '../types'

const utilityMap: Array<{ utilityType: UtilityType; patterns: RegExp[] }> = [
  { utilityType: 'hot_water', patterns: [/горяч/i, /гвс/i] },
  { utilityType: 'cold_water', patterns: [/холодн/i, /хвс/i] },
  { utilityType: 'sewer', patterns: [/водоотвед/i, /канализ/i] },
  { utilityType: 'electricity', patterns: [/электр/i, /свет/i] },
  { utilityType: 'gas', patterns: [/газ/i] },
  { utilityType: 'heating', patterns: [/отопл/i, /теплоснабж/i, /тепло/i] },
]

const stripHtml = (value: string): string =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')

const normalizeLine = (value: string): string => value.replace(/\s+/g, ' ').trim()

const inferUtilityType = (value: string): UtilityType => {
  const normalized = value.toLowerCase()
  const matched = utilityMap.find((item) => item.patterns.some((pattern) => pattern.test(normalized)))
  return matched?.utilityType ?? 'heating'
}

const parseLine = (text: string, outageKind: OutageKind): Power051DistrictStat | null => {
  const compact = normalizeLine(text)
  if (!compact) return null
  const districtMatch = compact.match(/район\s*[:-]?\s*([А-Яа-яЁё-\s]+)/i) ?? compact.match(/^([А-Яа-яЁё-\s]+?)\s+район/i)
  const housesMatch = compact.match(/(\d+)\s*(?:дом|жил\.\s*дом|МКД|здан)/i)
  if (!districtMatch && !housesMatch) return null

  const timeMatch = compact.match(/(?:до|восстановление(?:\s*ожидается)?\s*до|ориентировочно\s*до)\s*([0-9]{1,2}[:.][0-9]{2}(?:\s*[0-9]{2}\.[0-9]{2}\.[0-9]{4})?)/i)
  const reasonMatch = compact.match(/(?:причина|из-за|в связи с)\s*[:-]?\s*([^.;]+)/i)

  return {
    district: normalizeLine(districtMatch?.[1] ?? compact.split('|')[0] ?? 'Не указан'),
    utilityType: inferUtilityType(compact),
    outageKind,
    houses: Number(housesMatch?.[1] ?? 0),
    recoveryTime: timeMatch?.[1],
    reason: reasonMatch?.[1]?.trim(),
    description: compact,
  }
}

const extractSection = (html: string, headingPattern: RegExp): string => {
  const normalized = html.replace(/\r/g, '')
  const match = normalized.match(new RegExp(`${headingPattern.source}[\\s\\S]*?(?=<h[1-6][^>]*>|$)`, 'i'))
  return match?.[0] ?? ''
}

const parseSectionLines = (sectionHtml: string, kind: OutageKind): Power051DistrictStat[] => {
  const text = stripHtml(sectionHtml)
  return text
    .split(/\n+/)
    .map((line) => parseLine(line, kind))
    .filter((item): item is Power051DistrictStat => Boolean(item))
}

export const parse051OffPage = (html: string): { snapshotAt: string; planned: Power051DistrictStat[]; emergency: Power051DistrictStat[] } => {
  const snapshotText = stripHtml(html).replace(/\s+/g, ' ')
  const timestampMatch = snapshotText.match(/(\d{2}\.\d{2}\.\d{4}\s+[0-9]{1,2}:[0-9]{2})/)
  const snapshotAt = timestampMatch?.[1] ?? new Date().toISOString()
  const plannedSection = extractSection(html, /<h[1-6][^>]*>[^<]*план[^<]*<\/h[1-6]>/i)
  const emergencySection = extractSection(html, /<h[1-6][^>]*>[^<]*авар[^<]*<\/h[1-6]>/i)
  const planned = parseSectionLines(plannedSection, 'planned')
  const emergency = parseSectionLines(emergencySection, 'emergency')

  if (planned.length + emergency.length > 0) {
    return { snapshotAt, planned, emergency }
  }

  const fallbackLines = stripHtml(html).split(/\n+/)
  return {
    snapshotAt,
    planned: fallbackLines.map((line) => /план/i.test(line) ? parseLine(line, 'planned') : null).filter((item): item is Power051DistrictStat => Boolean(item)),
    emergency: fallbackLines.map((line) => /авар/i.test(line) ? parseLine(line, 'emergency') : null).filter((item): item is Power051DistrictStat => Boolean(item)),
  }
}
