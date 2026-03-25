import type { LiveSourceMode, SourceRegistryEntry } from '../types'

export const sourceRegistry: Record<'power051', SourceRegistryEntry> = {
  power051: {
    key: '051',
    title: '051 — отключения ЖКХ',
    sourceUrl: import.meta.env.VITE_051_PORTAL_URL || 'https://map.novo-sibirsk.ru/portal/disconnections?t=',
    snapshotPath: '/live-data/051/latest.json',
    ttlMinutes: 30,
  },
}

export const getLiveSourceMode = (): LiveSourceMode => {
  const raw = String(import.meta.env.VITE_SOURCE_MODE || 'hybrid').toLowerCase()
  if (raw === 'mock' || raw === 'live' || raw === 'hybrid') return raw
  return 'hybrid'
}

export const isRuntimeLiveFetchEnabled = (): boolean => String(import.meta.env.VITE_ENABLE_RUNTIME_LIVE_FETCH || 'true') === 'true'
