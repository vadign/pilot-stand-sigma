import type { AskSigmaQuery } from './types'

const punctuationRegex = /["'`~!?,.:;(){}<>«»]/g

export const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(punctuationRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const toStemPrefixes = (tokens: string[]): string[] =>
  tokens
    .filter((token) => token.length >= 3)
    .map((token) => token.slice(0, Math.min(token.length, 6)))

export const parseNumbers = (text: string): number[] => {
  const matches = text.match(/\d+/g)
  return matches ? matches.map((item) => Number(item)) : []
}

export const normalizeQuery = (raw: string): AskSigmaQuery => {
  const normalized = normalizeText(raw)
  const tokens = normalized ? normalized.split(' ') : []

  return {
    raw,
    normalized,
    tokens,
    stems: toStemPrefixes(tokens),
    numbers: parseNumbers(normalized),
  }
}
