import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPresentationClientId } from './clientId'

describe('getPresentationClientId', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('falls back to an in-memory id when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked')
    })

    const first = getPresentationClientId('display')
    const second = getPresentationClientId('display')

    expect(first).toBeTruthy()
    expect(second).toBe(first)
  })
})
