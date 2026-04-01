import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRandomId } from './randomId'

describe('createRandomId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'uuid-from-randomUUID',
    })

    expect(createRandomId()).toBe('uuid-from-randomUUID')
  })

  it('falls back to getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint8Array) => {
        values.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        return values
      },
    })

    expect(createRandomId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  it('falls back to Math.random when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)

    const id = createRandomId()

    expect(id).toMatch(/^[a-z0-9-]+$/)
    expect(id.length).toBeGreaterThan(10)
  })
})
