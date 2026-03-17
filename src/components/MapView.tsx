import { useMemo } from 'react'
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps'
import type { Incident } from '../types'

const severityColor: Record<Incident['severity'], string> = {
  низкий: '#3b82f6',
  средний: '#0ea5e9',
  высокий: '#f59e0b',
  критический: '#dc2626',
}

export function MapView({ incidents, onPick }: { incidents: Incident[]; onPick?: (id: string) => void }) {
  const mapState = useMemo(() => {
    if (incidents.length === 0) {
      return { center: [55.03, 82.98] as [number, number], zoom: 10 }
    }

    if (incidents.length === 1) {
      return { center: incidents[0].coordinates, zoom: 13 }
    }

    const latitudes = incidents.map((incident) => incident.coordinates[0])
    const longitudes = incidents.map((incident) => incident.coordinates[1])
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
  }, [incidents])

  return (
    <div className="h-[380px] w-full rounded-xl overflow-hidden">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          state={mapState}
          width="100%"
          height="100%"
          options={{ suppressMapOpenBlock: true }}
        >
          {incidents.map((incident) => (
            <Placemark
              key={incident.id}
              geometry={incident.coordinates}
              properties={{
                balloonContentHeader: incident.title,
                balloonContentBody: `Критичность: ${incident.severity}`,
                iconCaption: incident.id,
              }}
              options={{
                preset: 'islands#circleDotIcon',
                iconColor: severityColor[incident.severity],
              }}
              modules={['geoObject.addon.balloon']}
              onClick={() => onPick?.(incident.id)}
            />
          ))}
        </Map>
      </YMaps>
    </div>
  )
}
