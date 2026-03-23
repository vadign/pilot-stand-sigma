import { referenceObjectsFixture } from '../domain/fixtures'
import { parseOverpassObjects } from '../parsers/parseOverpass'
import type { SigmaReferenceObject } from '../types'

export class OverpassMedicalProvider {
  async fetchSnapshot(): Promise<SigmaReferenceObject[]> {
    return referenceObjectsFixture.filter((item) => item.sourceId === 'source-overpass-medical')
  }

  parse(payload: Parameters<typeof parseOverpassObjects>[0], districtId: string, updatedAt: string) {
    return parseOverpassObjects(payload, 'source-overpass-medical', 'medical', districtId, updatedAt)
  }
}
