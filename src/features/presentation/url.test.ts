import { describe, expect, it } from 'vitest'
import { buildFallbackMobileUrl, buildMobileRoute } from './url'

describe('presentation urls', () => {
  it('builds the mobile route from a session id', () => {
    expect(buildMobileRoute('session-1')).toBe('/mobile?s=session-1')
  })

  it('builds a fallback mobile url for non-local origins', () => {
    const url = buildFallbackMobileUrl('session-1', {
      origin: 'https://sigma.test',
      hostname: 'sigma.test',
    })

    expect(url).toBe('https://sigma.test/mobile?s=session-1')
  })

  it('does not use localhost as a qr fallback target', () => {
    const url = buildFallbackMobileUrl('session-1', {
      origin: 'http://localhost:5173',
      hostname: 'localhost',
    })

    expect(url).toBeUndefined()
  })
})
