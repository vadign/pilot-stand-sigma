import type { SigmaIndicator } from '../types'

export class CityAirProvider {
  isEnabled(): boolean {
    return Boolean(import.meta.env.VITE_CITYAIR_API_KEY)
  }

  async fetchSnapshot(): Promise<SigmaIndicator[]> {
    return []
  }
}
