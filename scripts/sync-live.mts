import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createManifest } from '../src/live/storage/liveManifest.ts'
import { sync051 } from './sync-051.mts'
import { syncOpenData } from './sync-opendata.mts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const liveRoot = join(root, 'public/live-data')
const parseVersion = '1.1.0'
const defaultSyncIntervalMs = 60 * 60 * 1000

const formatDuration = (durationMs: number): string => `${Math.round(durationMs / 100) / 10}s`

const getSyncIntervalMs = (): number => {
  const raw = Number(process.env.SIGMA_SNAPSHOT_SYNC_INTERVAL_MS ?? defaultSyncIntervalMs)
  if (!Number.isFinite(raw) || raw < 60_000) return defaultSyncIntervalMs
  return raw
}

export const syncLive = async () => {
  const records = [...await sync051(), ...await syncOpenData()]
  const manifest = createManifest(records, parseVersion)
  await writeFile(join(liveRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
  return manifest
}

export const startLiveSyncScheduler = ({ runOnStart = true }: { runOnStart?: boolean } = {}) => {
  const intervalMs = getSyncIntervalMs()
  let running = false

  const runNow = async (reason: 'startup' | 'hourly' | 'manual' = 'manual') => {
    if (running) {
      console.log(`[sync:live] skip ${reason}: previous sync still running`)
      return
    }

    running = true
    const startedAt = Date.now()
    console.log(`[sync:live] ${reason} sync started`)

    try {
      const manifest = await syncLive()
      console.log(`[sync:live] ${reason} sync finished in ${formatDuration(Date.now() - startedAt)} (${manifest.records.length} records)`)
      return manifest
    } catch (error) {
      console.error(`[sync:live] ${reason} sync failed: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    } finally {
      running = false
    }
  }

  console.log(`[sync:live] scheduler enabled: every ${Math.round(intervalMs / 60_000)} min`)
  if (runOnStart) void runNow('startup')

  const timer = setInterval(() => {
    void runNow('hourly')
  }, intervalMs)

  return {
    intervalMs,
    runNow,
    stop: () => clearInterval(timer),
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--watch')) {
    const scheduler = startLiveSyncScheduler()
    const shutdown = (signal: NodeJS.Signals) => {
      scheduler.stop()
      console.log(`[sync:live] scheduler stopped (${signal})`)
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  } else {
    const manifest = await syncLive()
    console.log(`manifest written with ${manifest.records.length} records`)
  }
}
