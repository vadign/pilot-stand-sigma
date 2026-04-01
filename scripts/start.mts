import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startLiveSyncScheduler } from './sync-live.mts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const scheduler = startLiveSyncScheduler({ runOnStart: false })

await scheduler.runNow('startup')

const vite = spawn(process.execPath, [viteBin, 'preview', ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
})

const shutdown = (signal: NodeJS.Signals) => {
  scheduler.stop()

  if (vite.exitCode === null && vite.signalCode === null) {
    vite.kill(signal)
    return
  }

  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

vite.on('error', (error) => {
  scheduler.stop()
  console.error(`[start] vite preview failed to start: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

vite.on('exit', (code, signal) => {
  scheduler.stop()

  if (signal) {
    console.log(`[start] vite preview stopped by signal ${signal}`)
    process.exit(0)
    return
  }

  process.exit(code ?? 0)
})
