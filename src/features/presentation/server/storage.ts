import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type {
  PresentationCommandEnvelope,
  PresentationController,
  PresentationScene,
} from '../types'

export interface PersistedPresentationSessionRecord {
  sid: string
  createdAt: number
  touchedAt: number
  scene: PresentationScene
  previousScene?: PresentationScene
  history: PresentationScene[]
  commandLog: PresentationCommandEnvelope[]
  controller?: PresentationController
}

export interface PresentationSessionStorage {
  load(): PersistedPresentationSessionRecord[]
  save(records: PersistedPresentationSessionRecord[]): void
}

export class MemoryPresentationSessionStorage implements PresentationSessionStorage {
  private records: PersistedPresentationSessionRecord[] = []

  load(): PersistedPresentationSessionRecord[] {
    return this.records.map((record) => structuredClone(record))
  }

  save(records: PersistedPresentationSessionRecord[]): void {
    this.records = records.map((record) => structuredClone(record))
  }
}

export class FilePresentationSessionStorage implements PresentationSessionStorage {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  load(): PersistedPresentationSessionRecord[] {
    if (!existsSync(this.filePath)) return []

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as PersistedPresentationSessionRecord[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  save(records: PersistedPresentationSessionRecord[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(records, null, 2), 'utf-8')
  }
}

export const createDefaultPresentationSessionStorage = (): PresentationSessionStorage => {
  const explicitMode = process.env.SIGMA_PRESENTATION_STORAGE
  if (explicitMode === 'memory' || process.env.NODE_ENV === 'test') {
    return new MemoryPresentationSessionStorage()
  }

  if (explicitMode === 'file' || process.env.NODE_ENV === 'production') {
    const configuredPath = process.env.SIGMA_PRESENTATION_STORAGE_FILE
    const filePath = configuredPath
      ? resolve(configuredPath)
      : resolve(process.cwd(), '.data/presentation-sessions.json')
    return new FilePresentationSessionStorage(filePath)
  }

  return new MemoryPresentationSessionStorage()
}
