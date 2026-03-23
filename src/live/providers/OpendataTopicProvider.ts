import { referenceObjectsFixture } from '../domain/fixtures'
import type { SigmaReferenceObject } from '../types'

export class OpendataTopicProvider {
  async fetchSnapshot(): Promise<SigmaReferenceObject[]> {
    return referenceObjectsFixture.filter((item) => item.sourceId.startsWith('source-opendata-'))
  }
}
