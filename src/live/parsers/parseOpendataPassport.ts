import { load } from 'cheerio'

export interface ParsedPassport {
  title: string
  csvUrl?: string
  updatedAt?: string
}

export const parseOpendataPassport = (html: string, baseUrl: string): ParsedPassport => {
  const $ = load(html)
  const title = $('h1, .h1, .dataset-title').first().text().trim() || 'Набор открытых данных'
  const csvHref = $('a[href*="csv"], a[href*="CSV"]').first().attr('href')
  const resolvedCsv = csvHref ? new URL(csvHref, baseUrl).toString() : undefined

  const bodyText = $('body').text().replace(/\s+/g, ' ')
  const updatedAtMatch = bodyText.match(/(?:Дата обновления|Обновлено|Дата актуализации)\s*[:-]?\s*(\d{2}\.\d{2}\.\d{4})/i)

  return {
    title,
    csvUrl: resolvedCsv,
    updatedAt: updatedAtMatch?.[1],
  }
}
