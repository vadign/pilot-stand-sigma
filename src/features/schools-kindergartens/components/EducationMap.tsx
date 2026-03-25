import { Clusterer, Map, Placemark, Polygon, YMaps } from '@pbe/react-yandex-maps'
import type { CoverageZone, EducationInstitution, ResidentialBuilding } from '../types'

export const EducationMap = ({
  institutions,
  zones,
  buildings,
  selectedId,
}: {
  institutions: EducationInstitution[]
  zones: CoverageZone[]
  buildings: ResidentialBuilding[]
  selectedId?: string
}) => (
  <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
    <YMaps query={{ lang: 'ru_RU' }}>
      <Map defaultState={{ center: [55.03, 82.92], zoom: 10 }} width="100%" height="100%" options={{ suppressMapOpenBlock: true }}>
        <Clusterer>
          {institutions.filter((item) => item.coordinates).map((item) => (
            <Placemark
              key={item.id}
              geometry={[item.coordinates!.lat, item.coordinates!.lon]}
              properties={{ hintContent: item.name, balloonContent: `${item.name}<br/>${item.addressRaw}` }}
              options={{ preset: item.id === selectedId ? 'islands#redCircleDotIcon' : item.dataTypeEntity === 'school' ? 'islands#blueCircleDotIcon' : 'islands#greenCircleDotIcon' }}
            />
          ))}
        </Clusterer>
        {zones.slice(0, 500).map((zone) => (
          zone.geometry.type === 'Polygon'
            ? <Polygon key={`${zone.institutionType}-${zone.institutionId}`} geometry={(zone.geometry.coordinates[0] as number[][]).map(([lon, lat]) => [lat, lon])} options={{ fillColor: zone.institutionType === 'school' ? '#3b82f633' : '#22c55e33', strokeColor: zone.institutionType === 'school' ? '#2563eb' : '#16a34a', strokeWidth: 1 }} properties={{ hintContent: `${zone.coverageLabel} (${zone.assignedBuildingsCount})` }} />
            : null
        ))}
        {buildings.slice(0, 1500).map((building) => <Placemark key={building.id} geometry={building.centroid} options={{ preset: 'islands#grayCircleDotIcon' }} />)}
      </Map>
    </YMaps>
  </div>
)
