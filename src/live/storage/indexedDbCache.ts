import { openDB } from 'idb'
import type { CachedLiveEntry } from '../types'

const DB_NAME = 'sigma-live-cache'
const STORE = 'entries'

const getDb = () => openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
  },
})

export const getCachedEntry = async <T>(key: string): Promise<CachedLiveEntry<T> | undefined> => {
  const db = await getDb()
  return db.get(STORE, key) as Promise<CachedLiveEntry<T> | undefined>
}

export const setCachedEntry = async <T>(entry: CachedLiveEntry<T>): Promise<void> => {
  const db = await getDb()
  await db.put(STORE, entry, entry.key)
}

export const isCacheFresh = (entry?: Pick<CachedLiveEntry<unknown>, 'expiresAt'>): boolean => {
  if (!entry) return false
  return new Date(entry.expiresAt).getTime() > Date.now()
}
