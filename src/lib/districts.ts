import { districts } from '../mocks/data'

const normalizeDistrictKey = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+район$/, '')
const districtDisplayOverrides: Record<string, { answerName?: string; aliases?: string[] }> = {
  sov: {
    answerName: 'Советский (Академгородок)',
    aliases: ['академгородок', 'академгородка', 'академгородке', 'академгородку', 'академгородком'],
  },
}

const buildDistrictAliases = (name: string): string[] => {
  const normalizedName = normalizeDistrictKey(name)

  if (!normalizedName.endsWith('ский')) return [normalizedName]

  const base = normalizedName.slice(0, -4)
  return [normalizedName, `${base}ского`, `${base}скому`, `${base}ском`, `${base}ским`]
}

const districtEntries = districts.map((district) => ({
  id: district.id,
  name: district.name,
  answerName: districtDisplayOverrides[district.id]?.answerName ?? district.name,
  aliases: Array.from(new Set([
    normalizeDistrictKey(district.id),
    ...buildDistrictAliases(district.name),
    ...(districtDisplayOverrides[district.id]?.aliases ?? []).map(normalizeDistrictKey),
  ])),
}))

const districtNameByKey = Object.fromEntries(
  districtEntries.flatMap(({ id, name, aliases }) => [
    [normalizeDistrictKey(id), name],
    [normalizeDistrictKey(name), name],
    ...aliases.map((alias) => [alias, name] as const),
  ]),
)

const districtIdByKey = Object.fromEntries(
  districtEntries.flatMap(({ id, aliases, name }) => [
    [normalizeDistrictKey(id), id],
    [normalizeDistrictKey(name), id],
    ...aliases.map((alias) => [alias, id] as const),
  ]),
)

const getEditDistance = (left: string, right: string): number => {
  const dp = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0))

  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[left.length][right.length]
}

const isFuzzyDistrictMatch = (token: string, alias: string): boolean => {
  if (token === alias) return true
  if (token.length < 5 || alias.length < 5) return false
  if (Math.abs(token.length - alias.length) > 1) return false

  return getEditDistance(token, alias) <= 1
}

export const getDistrictId = (district?: string): string | undefined => {
  if (!district) return undefined

  return districtIdByKey[normalizeDistrictKey(district)]
}

export const findDistrictId = (value?: string): string | undefined => {
  if (!value) return undefined

  const normalized = normalizeDistrictKey(value)
  if (!normalized) return undefined

  const directMatch = getDistrictId(normalized)
  if (directMatch) return directMatch

  const tokens = normalized.split(/\s+/)
  for (const token of tokens) {
    for (const district of districtEntries) {
      if (district.aliases.some((alias) => isFuzzyDistrictMatch(token, alias))) {
        return district.id
      }
    }
  }

  return undefined
}

export const getDistrictName = (district?: string): string => {
  if (!district) return ''

  const normalized = normalizeDistrictKey(district)
  const directName = districtNameByKey[normalized]
  if (directName) return directName

  const matchedDistrictId = findDistrictId(normalized)
  return matchedDistrictId ? districtNameByKey[matchedDistrictId] ?? district : district
}

export const getDistrictAnswerName = (district?: string): string => {
  const districtId = findDistrictId(district)
  if (!districtId) return getDistrictName(district)

  return districtEntries.find((item) => item.id === districtId)?.answerName ?? getDistrictName(districtId)
}
