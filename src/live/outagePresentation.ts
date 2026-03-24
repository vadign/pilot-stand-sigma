import type { OutageKind, UtilityType } from './types'
import { getOutageKindLabel } from './outageKindLabels'

const utilityLabels: Record<UtilityType, { standalone: string; titleObject: string }> = {
  heating: {
    standalone: 'отопление',
    titleObject: 'отопления',
  },
  hot_water: {
    standalone: 'горячая вода',
    titleObject: 'горячей воды',
  },
  cold_water: {
    standalone: 'холодная вода',
    titleObject: 'холодной воды',
  },
  sewer: {
    standalone: 'водоотведение',
    titleObject: 'водоотведения',
  },
  electricity: {
    standalone: 'электроснабжение',
    titleObject: 'электроснабжения',
  },
  gas: {
    standalone: 'газоснабжение',
    titleObject: 'газоснабжения',
  },
}

const compactUtilityLabels: Record<UtilityType, string> = {
  heating: 'отопление',
  hot_water: 'гор. вода',
  cold_water: 'хол. вода',
  sewer: 'водоотв.',
  electricity: 'электричество',
  gas: 'газ',
}

export const getUtilityLabel = (utilityType?: string): string => utilityLabels[utilityType as UtilityType]?.standalone ?? 'коммунальный ресурс'

export const getOutageTitleObject = (utilityType?: string): string => utilityLabels[utilityType as UtilityType]?.titleObject ?? 'коммунального ресурса'

export const getOutageTitle = (outageKind: OutageKind, utilityType?: string): string =>
  `${getOutageKindLabel(outageKind, 'titleSingular')} отключение ${getOutageTitleObject(utilityType)}`

export const getOutageCompactCaption = (outageKind: OutageKind, utilityType?: string): string =>
  `${outageKind === 'emergency' ? 'Экстр.' : 'План.'} ${compactUtilityLabels[utilityType as UtilityType] ?? 'ресурс'}`
