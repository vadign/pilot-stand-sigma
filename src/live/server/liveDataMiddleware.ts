import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, resolve } from 'node:path'

const liveDataPrefix = '/live-data/'

const contentTypeByExtension: Record<string, string> = {
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export const resolveLiveDataRequestPath = (rootDir: string, requestUrl: string): string | undefined => {
  const pathname = new URL(requestUrl, 'http://localhost').pathname
  if (!pathname.startsWith(liveDataPrefix)) return undefined

  const publicRoot = resolve(rootDir, 'public', 'live-data')
  const relativePath = pathname.slice(liveDataPrefix.length)
  const candidatePath = resolve(publicRoot, relativePath)

  if (candidatePath !== publicRoot && !candidatePath.startsWith(`${publicRoot}/`)) return undefined
  return candidatePath
}

export const readLiveDataRequest = async (
  rootDir: string,
  requestUrl: string,
): Promise<{ body: string; contentType: string } | null> => {
  const filePath = resolveLiveDataRequestPath(rootDir, requestUrl)
  if (!filePath) return null
  if (!await pathExists(filePath)) return null

  return {
    body: await readFile(filePath, 'utf-8'),
    contentType: contentTypeByExtension[extname(filePath)] ?? 'application/octet-stream',
  }
}

export const createLiveDataRequestHandler = (rootDir: string) => (req: IncomingMessage, res: ServerResponse, next: () => void) => {
  if (!req.url) {
    next()
    return
  }

  const requestUrl = req.url

  void (async () => {
    try {
      const response = await readLiveDataRequest(rootDir, requestUrl)
      if (!response) {
        next()
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', response.contentType)
      res.setHeader('Cache-Control', 'no-store')
      res.end(response.body)
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: String(error instanceof Error ? error.message : error) }))
    }
  })()
}
