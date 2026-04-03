import { describe, expect, it, vi } from 'vitest'
import { buildPresentationApiUrl } from './apiBase'

describe('presentation api base', () => {
  it('uses relative same-origin urls by default', () => {
    expect(buildPresentationApiUrl('/session/session-1/info')).toBe('/session/session-1/info')
  })

  it('uses a relative prefix when VITE_PRESENTATION_API_BASE is a path', () => {
    vi.stubEnv('VITE_PRESENTATION_API_BASE', '/sigma')

    expect(buildPresentationApiUrl('/session/session-1/info')).toBe('/sigma/session/session-1/info')
  })

  it('uses an absolute base when VITE_PRESENTATION_API_BASE is an absolute url', () => {
    vi.stubEnv('VITE_PRESENTATION_API_BASE', 'https://api.sigma.test/base')

    expect(buildPresentationApiUrl('/session/session-1/info')).toBe(
      'https://api.sigma.test/base/session/session-1/info',
    )
  })
})
