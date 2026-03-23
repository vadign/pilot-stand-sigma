import { districtBoundariesFixture } from '../domain/fixtures'
import type { SigmaDistrictBoundary } from '../types'

export class DistrictBoundaryProvider {
  async fetchSnapshot(): Promise<SigmaDistrictBoundary[]> {
    return districtBoundariesFixture
  }
}
