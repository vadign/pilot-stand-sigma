import type { PresentationApplyPresetCommand, PresentationCommand } from './types'

export interface PresentationPreset {
  id: string
  label: string
  note?: string
  commands: PresentationCommand[]
}

export const presentationPresets: PresentationPreset[] = [
  {
    id: 'mayor-overview',
    label: 'Обзор мэра',
    note: 'Стартовая сцена по ЖКХ и энергетике.',
    commands: [
      {
        type: 'OPEN_PAGE',
        page: {
          pageKey: 'mayor-dashboard',
          subsystem: 'heat',
          district: '',
          view: 'map',
          mode: 'minibus',
          route: '35',
          fromDistrict: '',
          toDistrict: '',
          focus: 'overview',
          pavilionOnly: false,
        },
        label: 'Панель мэра · Энергетика',
      },
    ],
  },
  {
    id: 'transport-story',
    label: 'Транспорт',
    note: 'Быстрый переход к транспортному контуру и связности районов.',
    commands: [
      {
        type: 'OPEN_PAGE',
        page: {
          pageKey: 'mayor-dashboard',
          subsystem: 'transport',
          district: '',
          view: 'map',
          mode: 'minibus',
          route: '35',
          fromDistrict: '',
          toDistrict: '',
          focus: 'connectivity',
          pavilionOnly: false,
        },
        label: 'Панель мэра · Общественный транспорт',
      },
    ],
  },
  {
    id: 'briefing-story',
    label: 'Брифинг',
    note: 'Сводка для обсуждения с акцентом на summary.',
    commands: [
      {
        type: 'OPEN_PAGE',
        page: { pageKey: 'briefing', focus: 'summary', incident: '' },
        label: 'Управленческий отчет',
      },
    ],
  },
  {
    id: 'history-story',
    label: 'История',
    note: 'Тренд за 7 дней с быстрым переключением к аналитике.',
    commands: [
      {
        type: 'OPEN_PAGE',
        page: { pageKey: 'history', period: '7d', focus: 'trend' },
        label: 'История и аналитика',
      },
    ],
  },
]

export const getPresentationPreset = (presetId: PresentationApplyPresetCommand['presetId']) =>
  presentationPresets.find((preset) => preset.id === presetId)
