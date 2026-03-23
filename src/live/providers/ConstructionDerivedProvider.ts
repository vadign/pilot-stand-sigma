import type { ConstructionDatasetBundle, SigmaConstructionObject } from '../types'

export class ConstructionDerivedProvider {
  buildObjects(bundle: ConstructionDatasetBundle): SigmaConstructionObject[] {
    return [
      ...bundle.active.map((item) => ({
        id: item.id,
        kadNom: item.KadNom,
        title: item.objectName,
        address: item.address,
        developer: item.developer,
        districtId: item.districtId,
        districtName: item.districtName,
        status: 'active' as const,
        sourceId: 'source-opendata-construction-permits',
        updatedAt: bundle.permitsMeta.fetchedAt,
      })),
      ...bundle.commissioned.slice(0, 6).map((item) => ({
        id: item.id,
        kadNom: item.KadNom,
        title: item.NameOb,
        address: item.AdrOb,
        developer: item.Zastr,
        districtId: item.districtId,
        districtName: item.districtName,
        status: 'commissioned' as const,
        sourceId: 'source-opendata-construction-commissioned',
        updatedAt: bundle.commissionedMeta.fetchedAt,
      })),
    ]
  }
}
