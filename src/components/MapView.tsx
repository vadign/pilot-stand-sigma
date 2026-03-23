import { useMemo } from 'react'
import { YMaps, Map, Placemark, Polygon } from '@pbe/react-yandex-maps'
import type { Incident } from '../types'
import type { SigmaDistrictBoundary, SigmaReferenceObject } from '../live/types'

const severityColor: Record<Incident['severity'], string> = {
  низкий: '#3b82f6',
  средний: '#0ea5e9',
  высокий: '#f59e0b',
  критический: '#dc2626',
}

const referenceColors: Record<SigmaReferenceObject['category'], string> = {
  camera: '#7c3aed',
  medical: '#059669',
  stop: '#2563eb',
  school: '#0ea5e9',
  kindergarten: '#f97316',
  library: '#6366f1',
  pharmacy: '#10b981',
  sport_ground: '#65a30d',
  sport_org: '#16a34a',
  culture: '#ec4899',
  parking: '#64748b',
}

export function MapView({ incidents, referenceObjects = [], boundaries = [], onPick }: { incidents: Incident[]; referenceObjects?: SigmaReferenceObject[]; boundaries?: SigmaDistrictBoundary[]; onPick?: (id: string) => void }) {
  const mapState = useMemo(() => {
    const points = [...incidents.map((incident) => incident.coordinates), ...referenceObjects.map((item) => item.coordinates), ...boundaries.map((item) => item.centroid)]
    if (points.length === 0) {
      return { center: [55.03, 82.98] as [number, number], zoom: 10 }
    }

    if (points.length === 1) {
      return { center: points[0], zoom: 13 }
    }

    const latitudes = points.map((point) => point[0])
    const longitudes = points.map((point) => point[1])
    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)
    const spread = Math.max(maxLat - minLat, maxLng - minLng)

    let zoom = 13
    if (spread > 0.24) zoom = 10
    else if (spread > 0.12) zoom = 11
    else if (spread > 0.05) zoom = 12

    return {
      center: [Number(((minLat + maxLat) / 2).toFixed(6)), Number(((minLng + maxLng) / 2).toFixed(6))] as [number, number],
      zoom,
    }
  }, [boundaries, incidents, referenceObjects])

  return (
    <div className="h-[380px] w-full rounded-xl overflow-hidden">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          state={mapState}
          width="100%"
          height="100%"
          options={{ suppressMapOpenBlock: true }}
        >
          {boundaries.map((boundary) => (
            <Polygon
              key={boundary.id}
              geometry={[boundary.polygon]}
              options={{ fillColor: 'rgba(37, 99, 235, 0.05)', strokeColor: '#2563eb', strokeOpacity: 0.4, strokeWidth: 1 }}
            />
          ))}
          {incidents.map((incident) => (
            <Placemark
              key={incident.id}
              geometry={incident.coordinates}
              properties={{
                balloonContentHeader: incident.title,
                balloonContentBody: `Критичность: ${incident.severity}`,
                iconCaption: incident.id,
              }}
              options={{ preset: 'islands#circleDotIcon', iconColor: severityColor[incident.severity] }}
              modules={['geoObject.addon.balloon']}
              onClick={() => onPick?.(incident.id)}
            />
          ))}
          {referenceObjects.map((item) => (
            <Placemark
              key={item.id}
              geometry={item.coordinates}
              properties={{
                balloonContentHeader: item.title,
                balloonContentBody: `${item.category} · ${item.address ?? ''}`,
                iconCaption: item.category,
              }}
              options={{ preset: 'islands#dotIcon', iconColor: referenceColors[item.category] }}
              modules={['geoObject.addon.balloon']}
            />
          ))}
        </Map>
      </YMaps>
    </div>
  )
}
