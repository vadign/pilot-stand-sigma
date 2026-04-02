// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readLiveDataRequest, resolveLiveDataRequestPath } from '../server/liveDataMiddleware'

const tempRoots: string[] = []

const makeRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'sigma-live-data-'))
  tempRoots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('liveDataMiddleware helpers', () => {
  it('resolves files under public/live-data', async () => {
    const root = await makeRoot()
    const publicLiveData = join(root, 'public/live-data/051')

    await mkdir(publicLiveData, { recursive: true })
    await writeFile(join(publicLiveData, 'latest.json'), '{"snapshotAt":"2026-04-02T07:32:21.651Z"}', 'utf-8')

    const response = await readLiveDataRequest(root, '/live-data/051/latest.json?ts=123')

    expect(response).toEqual({
      body: '{"snapshotAt":"2026-04-02T07:32:21.651Z"}',
      contentType: 'application/json; charset=utf-8',
    })
  })

  it('blocks path traversal outside public/live-data', async () => {
    const root = await makeRoot()

    expect(resolveLiveDataRequestPath(root, '/live-data/../package.json')).toBeUndefined()
  })

  it('returns null when file is missing', async () => {
    const root = await makeRoot()

    await mkdir(join(root, 'public/live-data'), { recursive: true })

    await expect(readLiveDataRequest(root, '/live-data/051/latest.json')).resolves.toBeNull()
  })
})
