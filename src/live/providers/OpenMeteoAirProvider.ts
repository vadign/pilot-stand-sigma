import { airIndicatorFixture } from '../domain/fixtures'
import { parseOpenMeteoIndicators } from '../parsers/parseOpenMeteo'
import type { SigmaIndicator } from '../types'

export class OpenMeteoAirProvider {
  async fetchSnapshot(): Promise<SigmaIndicator[]> {
    return airIndicatorFixture
  }

  parse(payload: Parameters<typeof parseOpenMeteoIndicators>[0], updatedAt: string) {
    return parseOpenMeteoIndicators(payload, 'source-openmeteo-air', updatedAt)
  }
}
