import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createManifest } from '../src/live/storage/liveManifest.ts'
import { sync051 } from './sync-051.mts'
import { syncOpenData } from './sync-opendata.mts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const liveRoot = join(root, 'public/live-data')

const records = [...await sync051(), ...await syncOpenData()]
const manifest = createManifest(records, '1.0.0')
await writeFile(join(liveRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
console.log(`manifest written with ${records.length} records`)
