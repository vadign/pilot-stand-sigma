import type { IncomingMessage } from 'node:http'
import { describe, expect, it } from 'vitest'
import { buildRequestOrigin } from './middleware'

const createSocket = (encrypted: boolean): IncomingMessage['socket'] =>
  ({ encrypted } as unknown as IncomingMessage['socket'])

const createRequest = (overrides: Partial<IncomingMessage> = {}): IncomingMessage => ({
  headers: {},
  socket: createSocket(false),
  ...overrides,
} as IncomingMessage)

describe('buildRequestOrigin', () => {
  it('returns https origin for forwarded public host', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'sigma.public.example',
      },
    })

    expect(buildRequestOrigin(req)).toBe('https://sigma.public.example')
  })

  it('uses first forwarded proto value from a comma-separated list', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-proto': 'https,http',
        'x-forwarded-host': 'sigma.public.example',
      },
    })

    expect(buildRequestOrigin(req)).toBe('https://sigma.public.example')
  })

  it('falls back to direct host and socket protocol when forwarded headers are missing', () => {
    const req = createRequest({
      headers: {
        host: 'intranet.example:5173',
      },
      socket: createSocket(true),
    })

    expect(buildRequestOrigin(req)).toBe('https://intranet.example:5173')
  })

  it('replaces localhost host with a LAN address', () => {
    const req = createRequest({
      headers: {
        host: 'localhost:5173',
      },
      socket: createSocket(true),
    })

    const origin = new URL(buildRequestOrigin(req))
    expect(origin.protocol).toBe('https:')
    expect(origin.port).toBe('5173')
    expect(origin.hostname).toMatch(/^(?!localhost$)(?!127\.0\.0\.1$)(?!0\.0\.0\.0$).+/)
  })
})
