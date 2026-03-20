export interface ParsedPassport {
  title: string
  csvUrl?: string
  updatedAt?: string
}

const decodeHtml = (value: string): string => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, '\'')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value: string): string => decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

const matchFirst = (html: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return stripTags(match[1])
  }
  return undefined
}

export const parseOpendataPassport = (html: string, baseUrl: string): ParsedPassport => {
  const title = matchFirst(html, [
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<[^>]*class=["'][^"']*\bh1\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<[^>]*class=["'][^"']*dataset-title[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  ]) || 'Набор открытых данных'

  const csvHref = html.match(/<a\b[^>]*href=["']([^"']*csv[^"']*)["'][^>]*>/i)?.[1]
  const bodyText = stripTags(html)
  const updatedAtMatch = bodyText.match(/(?:Дата обновления|Обновлено|Дата актуализации)\s*[:-]?\s*(\d{2}\.\d{2}\.\d{4})/i)

  return {
    title,
    csvUrl: csvHref ? new URL(csvHref, baseUrl).toString() : undefined,
    updatedAt: updatedAtMatch?.[1],
  }
}
