import type { AskSigmaEntity, AskSigmaQuery } from './types'

const entityKeywords: Record<AskSigmaEntity, string[]> = {
  incident: ['инцидент', 'событи', 'авар', 'отключен', 'прорыв', 'сбой', 'жкх'],
  regulation: ['регламент', 'правил', 'норм', 'предписан', 'что делать'],
  history: ['истори', 'аналит', 'динамик', 'тренд', 'за неделю', 'за месяц'],
  scenario: ['сценар', 'прогноз', 'что будет', 'смоделируй'],
  deputy: ['заместител', 'агент', 'помощник'],
  approval: ['одобри', 'согласуй', 'эскалируй', 'требует решения'],
  dashboard: ['сводка', 'панель', 'сейчас'],
  briefing: ['бриф', '24 часа'],
  map: ['карта', 'на карте', 'координат'],
  construction: ['стройк', 'строительств', 'разрешен', 'ввод в эксплуатац'],
  sources: ['источник', 'live-источник', 'когда обновлялись', 'обновлялись данные', 'freshness'],
  help: ['помощь', 'подскажи', 'что умеешь'],
}

const subsystemKeywords: Record<string, string[]> = {
  heating: ['отоплен', 'тепл', 'теплоснабж'],
  roads: ['дорог', 'трафик', 'пробк', 'затор'],
  air: ['воздух', 'aqi', 'pm', 'эколог', 'смог'],
  noise: ['шум', 'дециб', 'акуст'],
}

const includesKeyword = (query: AskSigmaQuery, keyword: string): boolean => {
  if (keyword.includes(' ')) return query.normalized.includes(keyword)
  return query.tokens.some((token) => token.includes(keyword)) || query.stems.some((stem) => stem.includes(keyword.slice(0, 3)))
}

export const routeEntity = (query: AskSigmaQuery): { entity: AskSigmaEntity; subsystem?: string } => {
  let best: AskSigmaEntity = 'help'
  let bestScore = -1

  for (const [entity, keywords] of Object.entries(entityKeywords) as [AskSigmaEntity, string[]][]) {
    const score = keywords.reduce((acc, keyword) => (includesKeyword(query, keyword) ? acc + 1 : acc), 0)
    if (score > bestScore) {
      bestScore = score
      best = entity
    }
  }

  const subsystem = Object.entries(subsystemKeywords).find(([, keywords]) => keywords.some((keyword) => includesKeyword(query, keyword)))?.[0]
  if (bestScore <= 0) return { entity: 'help', subsystem }
  return { entity: best, subsystem }
}
