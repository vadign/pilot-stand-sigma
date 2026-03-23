import { weatherIndicatorFixture } from '../domain/fixtures'
import { parseOpenMeteoIndicators } from '../parsers/parseOpenMeteo'
import type { SigmaIndicator } from '../types'

export class OpenMeteoWeatherProvider {
  async fetchSnapshot(): Promise<SigmaIndicator[]> {
    return weatherIndicatorFixture
  }

  parse(payload: Parameters<typeof parseOpenMeteoIndicators>[0], updatedAt: string) {
    return parseOpenMeteoIndicators(payload, 'source-openmeteo-weather', updatedAt)
  }
}
