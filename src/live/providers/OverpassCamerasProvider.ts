import { referenceObjectsFixture } from '../domain/fixtures'
import { parseOverpassObjects } from '../parsers/parseOverpass'
import type { SigmaReferenceObject } from '../types'

export class OverpassCamerasProvider {
  async fetchSnapshot(): Promise<SigmaReferenceObject[]> {
    return referenceObjectsFixture.filter((item) => item.sourceId === 'source-overpass-cameras')
  }

  parse(payload: Parameters<typeof parseOverpassObjects>[0], districtId: string, updatedAt: string) {
    return parseOverpassObjects(payload, 'source-overpass-cameras', 'camera', districtId, updatedAt)
  }
}
