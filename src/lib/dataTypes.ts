import type { DataType } from '../types'

const dataTypeLabels: Record<DataType, string> = {
  real: 'данные с датчиков',
  calculated: 'аналитические данные',
  simulation: 'сценарное моделирование',
  pilot: 'пилотные данные',
}

export const getDataTypeLabel = (type: DataType): string => dataTypeLabels[type]
