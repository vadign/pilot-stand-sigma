import type { SigmaRole } from '../types'

export const voiceWakeWordStripRegex = /^(с(?:[ие]гма|има)[!,.]?\s*)/i
export const safetyWakeWordStripRegex = /^с(?:[ие]гма|има)[!,.:)?\s]*/i

const roleMatchers: { role: SigmaRole; regex: RegExp }[] = [
  { role: 'мэр', regex: /^(?:я\s+)?(?:мэр|руководитель)(?:\s|$)/i },
  { role: 'диспетчер', regex: /^(?:я\s+)?(?:диспетчер|служащ(?:ий|ая)?)(?:\s|$)/i },
  { role: 'аналитик', regex: /^(?:я\s+)?аналитик(?:\s|$)/i },
]

const districts = ['советский', 'ленинский', 'центральный', 'кольцово', 'академгородок']

export const stripWakeWord = (text: string): string => text.replace(voiceWakeWordStripRegex, '').trim()

export const stripSafetyWakeWord = (text: string): string => text.replace(safetyWakeWordStripRegex, '').trim()

export const parseRoleCommand = (text: string): { role: SigmaRole; district?: string } | null => {
  const normalized = stripSafetyWakeWord(text.toLowerCase().replace(/ё/g, 'е').trim())
  const roleMatch = roleMatchers.find((item) => item.regex.test(normalized))
  if (!roleMatch) return null

  const district = districts.find((name) => new RegExp(`(?:^|\\s)${name}(?:\\s|$)`, 'i').test(normalized))
  return {
    role: roleMatch.role,
    district,
  }
}
