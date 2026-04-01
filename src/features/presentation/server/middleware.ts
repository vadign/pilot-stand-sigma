import type { IncomingMessage, ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import {
  type PresentationAskRequest,
  type PresentationCommandRequest,
  type PresentationPresentRequest,
  type PresentationRole,
} from '../types'
import { PresentationSessionManager } from './sessionManager'

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
}

const sessionRoutePattern = /^\/session\/([^/]+)\/(info|stream|command|ask|present)$/
const localhostHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

const isPrivateIpv4 = (address: string): boolean =>
  address.startsWith('10.') ||
  address.startsWith('192.168.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)

const getPreferredLanAddress = (): string | undefined => {
  const interfaces = networkInterfaces()
  const candidates: string[] = []

  for (const addresses of Object.values(interfaces)) {
    if (!addresses) continue
    for (const address of addresses) {
      if (address.internal || address.family !== 'IPv4') continue
      candidates.push(address.address)
    }
  }

  return candidates.find(isPrivateIpv4) ?? candidates[0]
}

const writeJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode
  Object.entries(jsonHeaders).forEach(([key, value]) => res.setHeader(key, value))
  res.end(JSON.stringify(payload))
}

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf-8') || '{}'
  return JSON.parse(raw) as T
}

export const buildRequestOrigin = (req: IncomingMessage): string => {
  const forwardedHost = req.headers['x-forwarded-host']
  const host = typeof forwardedHost === 'string'
    ? forwardedHost.split(',')[0].trim()
    : req.headers.host ?? 'localhost'
  const forwardedProto = req.headers['x-forwarded-proto']
  const maybeTlsSocket = req.socket as typeof req.socket & { encrypted?: boolean }
  const protocol = typeof forwardedProto === 'string'
    ? forwardedProto.split(',')[0]
    : maybeTlsSocket.encrypted ? 'https' : 'http'
  const origin = new URL(`${protocol}://${host}`)

  if (localhostHosts.has(origin.hostname)) {
    const lanAddress = getPreferredLanAddress()
    if (lanAddress) origin.hostname = lanAddress
  }

  return origin.origin
}

const getRequiredQueryParam = (
  reqUrl: URL,
  key: 'clientId' | 'role',
): string => {
  const value = reqUrl.searchParams.get(key)?.trim()
  if (!value) {
    throw new Error(`${key} is required`)
  }
  return value
}

const isPresentationRole = (value: string): value is PresentationRole =>
  value === 'mobile' || value === 'display' || value === 'viewer'

export const createPresentationSessionMiddleware = (
  manager = new PresentationSessionManager(),
) => {
  const handlePresentationRequest = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://localhost')

    if (requestUrl.pathname === '/session/create') {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const info = manager.createSession(buildRequestOrigin(req))
      writeJson(res, 200, { sid: info.sid, expiresAt: info.expiresAt })
      return
    }

    const match = requestUrl.pathname.match(sessionRoutePattern)
    if (!match) {
      next()
      return
    }

    const [, sid, action] = match
    const origin = buildRequestOrigin(req)

    void (async () => {
      try {
        if (action === 'info') {
          if (req.method !== 'GET') {
            writeJson(res, 405, { error: 'Method not allowed' })
            return
          }

          const role = getRequiredQueryParam(requestUrl, 'role')
          getRequiredQueryParam(requestUrl, 'clientId')
          if (!isPresentationRole(role)) {
            writeJson(res, 400, { error: 'role must be mobile, viewer, or display' })
            return
          }

          writeJson(res, 200, manager.getInfo(sid, origin))
          return
        }

        if (action === 'stream') {
          if (req.method !== 'GET') {
            writeJson(res, 405, { error: 'Method not allowed' })
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          res.flushHeaders?.()

          const unsubscribe = manager.subscribe(sid, origin, {
            send: (event) => {
              res.write(`event: ${event.type}\n`)
              res.write(`data: ${JSON.stringify(event.payload)}\n\n`)
            },
            close: () => {
              if (!res.writableEnded) res.end()
            },
          })

          req.on('close', () => {
            unsubscribe()
            if (!res.writableEnded) res.end()
          })
          return
        }

        if (action === 'command') {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed' })
            return
          }

          const body = await readJsonBody<PresentationCommandRequest>(req)
          const response = manager.submitCommand(sid, origin, body)
          if ('error' in response) {
            writeJson(res, 409, response)
            return
          }
          writeJson(res, 200, response)
          return
        }

        if (action === 'ask') {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed' })
            return
          }

          const body = await readJsonBody<PresentationAskRequest>(req)
          const response = manager.submitAsk(sid, origin, body)
          if ('error' in response) {
            writeJson(res, 409, response)
            return
          }
          writeJson(res, 200, response)
          return
        }

        if (action === 'present') {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed' })
            return
          }

          const body = await readJsonBody<PresentationPresentRequest>(req)
          const response = manager.submitPresent(sid, origin, body)
          if ('error' in response) {
            writeJson(res, 409, response)
            return
          }
          writeJson(res, 200, response)
          return
        }

        next()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const statusCode = message.startsWith('Presentation session not found') ? 404 : message.startsWith('Invalid presentation route') ? 400 : 500
        if (res.headersSent) {
          if (!res.writableEnded) res.end()
          return
        }
        writeJson(res, statusCode, { error: message })
      }
    })()
  }

  return {
    manager,
    handlePresentationRequest,
  }
}
