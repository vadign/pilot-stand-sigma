import type { LiveSourceMode, SourceRegistryEntry } from '../types'

export const sourceRegistry: Record<'power051' | 'constructionPermits' | 'constructionCommissioned' | 'constructionActive', SourceRegistryEntry> = {
  power051: {
    key: '051',
    title: '051 — отключения ЖКХ',
    sourceUrl: import.meta.env.VITE_051_URL || 'https://051.novo-sibirsk.ru/SitePages/off.aspx',
    snapshotPath: '/live-data/051/latest.json',
    ttlMinutes: 30,
  },
  constructionPermits: {
    key: 'opendata',
    title: 'OpenData — разрешения на строительство',
    sourceUrl: `${import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru'}/pass.aspx?ID=124`,
    snapshotPath: '/live-data/opendata/construction-permits.json',
    ttlMinutes: 60 * 24,
  },
  constructionCommissioned: {
    key: 'opendata',
    title: 'OpenData — ввод в эксплуатацию',
    sourceUrl: `${import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru'}/pass.aspx?ID=125`,
    snapshotPath: '/live-data/opendata/construction-commissioned.json',
    ttlMinutes: 60 * 24,
  },
  constructionActive: {
    key: 'opendata',
    title: 'OpenData — активные стройки',
    sourceUrl: `${import.meta.env.VITE_OPENDATA_BASE_URL || 'https://opendata.novo-sibirsk.ru'}/pass.aspx?ID=124`,
    snapshotPath: '/live-data/opendata/construction-active.json',
    ttlMinutes: 60 * 24,
  },
}

export const getLiveSourceMode = (): LiveSourceMode => {
  const raw = String(import.meta.env.VITE_SOURCE_MODE || 'hybrid').toLowerCase()
  if (raw === 'mock' || raw === 'live' || raw === 'hybrid') return raw
  return 'hybrid'
}

export const isRuntimeLiveFetchEnabled = (): boolean => String(import.meta.env.VITE_ENABLE_RUNTIME_LIVE_FETCH || 'true') === 'true'
