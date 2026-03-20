import type { CachedLiveEntry } from '../types'

const DB_NAME = 'sigma-live-cache'
const STORE = 'entries'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | undefined

const isIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined'

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, VERSION)

  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
  }

  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
})

const getDb = async (): Promise<IDBDatabase | undefined> => {
  if (!isIndexedDbAvailable()) return undefined

  dbPromise ??= openDatabase().catch((error) => {
    dbPromise = undefined
    throw error
  })

  return dbPromise.catch(() => undefined)
}

export const getCachedEntry = async <T>(key: string): Promise<CachedLiveEntry<T> | undefined> => {
  const db = await getDb()
  if (!db) return undefined

  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result as CachedLiveEntry<T> | undefined)
    request.onerror = () => resolve(undefined)
  })
}

export const setCachedEntry = async <T>(entry: CachedLiveEntry<T>): Promise<void> => {
  const db = await getDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry, entry.key)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

export const isCacheFresh = (entry?: Pick<CachedLiveEntry<unknown>, 'expiresAt'>): boolean => {
  if (!entry) return false
  return new Date(entry.expiresAt).getTime() > Date.now()
}
