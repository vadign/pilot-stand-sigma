import type { LiveManifest, LiveManifestRecord } from '../types'

export const createManifest = (records: LiveManifestRecord[], parseVersion: string): LiveManifest => ({
  generatedAt: new Date().toISOString(),
  parseVersion,
  records,
})
