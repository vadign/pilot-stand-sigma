import { getCachedEntry, isCacheFresh, setCachedEntry } from '../storage/indexedDbCache'
import type { CachedLiveEntry } from '../types'

export class LiveCacheProvider {
  async read<T>(key: string): Promise<{ entry?: CachedLiveEntry<T>; fresh: boolean }> {
    const entry = await getCachedEntry<T>(key)
    return { entry, fresh: isCacheFresh(entry) }
  }

  async write<T>(entry: CachedLiveEntry<T>): Promise<void> {
    await setCachedEntry(entry)
  }
}
