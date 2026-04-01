const toHex = (value: number): string => value.toString(16).padStart(2, '0')

const createUuidFromRandomValues = (): string | undefined => {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) return undefined

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, toHex)
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

const createMathFallbackId = (): string =>
  [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join('-')

export const createRandomId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  createUuidFromRandomValues() ??
  createMathFallbackId()
