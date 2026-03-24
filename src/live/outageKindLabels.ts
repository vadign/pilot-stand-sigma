import type { OutageKind } from './types'

type OutageKindLabelSet = {
  singular: string
  plural: string
  genitivePlural: string
  titleSingular: string
  titlePlural: string
}

const outageKindLabels: Record<OutageKind, OutageKindLabelSet> = {
  emergency: {
    singular: 'экстренное',
    plural: 'экстренные',
    genitivePlural: 'экстренных',
    titleSingular: 'Экстренное',
    titlePlural: 'Экстренные',
  },
  planned: {
    singular: 'запланированное',
    plural: 'запланированные',
    genitivePlural: 'запланированных',
    titleSingular: 'Запланированное',
    titlePlural: 'Запланированные',
  },
}

export const getOutageKindLabel = (kind: OutageKind, form: keyof OutageKindLabelSet): string => outageKindLabels[kind][form]
