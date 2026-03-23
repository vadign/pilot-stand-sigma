import { parseCsvDataset } from '../../../live/parsers/parseCsvDataset'
import { inferTransitMode } from '../utils/parseRoutes'
import type { TransportFare, TransitMode } from '../types'

const getFromAliases = (row: Record<string, string>, aliases: string[]): string => {
  const entries = Object.entries(row)
  for (const alias of aliases) {
    const found = entries.find(([key]) => key.toLowerCase().includes(alias.toLowerCase()))
    if (found) return found[1].trim()
  }
  return ''
}

const parseAmount = (row: Record<string, string>): number | undefined => {
  const explicit = getFromAliases(row, ['стоим', 'цен', 'amount', 'тариф'])
  const inline = explicit || Object.values(row).find((value) => /\d+[,.]?\d*/.test(value)) || ''
  const match = inline.replace(/\s/g, '').match(/\d+[,.]?\d*/)
  if (!match) return undefined
  const amount = Number(match[0].replace(',', '.'))
  return Number.isFinite(amount) ? amount : undefined
}

const detectMode = (row: Record<string, string>): TransitMode => {
  const explicit = getFromAliases(row, ['вид транспорта', 'транспорт', 'mode'])
  if (explicit) return inferTransitMode(explicit)

  const combined = Object.values(row).join(' ')
  return inferTransitMode(combined)
}

export const parseTariffsCsv = (csvText: string, updatedAt = new Date().toISOString(), source = 'opendata.novo-sibirsk.ru'): TransportFare[] => {
  const rows = parseCsvDataset<Record<string, string>>(csvText)

  return rows.flatMap((row, index) => {
    const amount = parseAmount(row)
    if (amount === undefined) return []

    const mode = detectMode(row)
    const fareType = getFromAliases(row, ['тип тарифа', 'тариф', 'категор', 'fare']) || 'Базовый тариф'
    const validFrom = getFromAliases(row, ['действ', 'valid', 'дата']) || undefined
    const carrier = getFromAliases(row, ['перевозчик', 'carrier']) || undefined

    return [{
      id: String(row.ID ?? row.Id ?? row.id ?? `fare-${index + 1}`),
      mode,
      fareType,
      amount,
      currency: 'RUB',
      validFrom,
      carrier,
      source,
      updatedAt,
      raw: row,
    }]
  })
}
