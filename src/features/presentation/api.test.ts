import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPresentationSessionInfo,
  postPresentationCommand,
  PresentationControllerConflictError,
} from './api'

const sessionRequest = {
  sid: 'session-1',
  clientId: 'mobile-1',
  role: 'mobile' as const,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('presentation api error handling', () => {
  it('uses JSON error payload when backend returns api error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'temporary failure' }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(fetchPresentationSessionInfo(sessionRequest)).rejects.toThrow('temporary failure')
  })

  it('returns readable error for html payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })))

    await expect(fetchPresentationSessionInfo(sessionRequest)).rejects.toThrow(
      'Request failed: 502 Bad Gateway — <html><body><h1>502 Bad Gateway</h1></body></html>',
    )
  })

  it('returns readable error for empty response body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    })))

    await expect(fetchPresentationSessionInfo(sessionRequest)).rejects.toThrow(
      'Request failed: 503 Service Unavailable — пустой ответ',
    )
  })

  it('keeps controller conflict error flow for 409 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: 'controller_conflict',
      controller: { clientId: 'other-mobile', claimedAt: '2026-04-01T12:00:00.000Z' },
    }), {
      status: 409,
      statusText: 'Conflict',
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(postPresentationCommand('session-1', {
      clientId: 'mobile-1',
      command: { type: 'CLEAR_TO_IDLE' },
    })).rejects.toBeInstanceOf(PresentationControllerConflictError)
  })
})
