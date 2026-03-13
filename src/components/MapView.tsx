import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps'
import type { Incident } from '../types'

const severityColor: Record<Incident['severity'], string> = {
  низкий: '#3b82f6',
  средний: '#0ea5e9',
  высокий: '#f59e0b',
  критический: '#dc2626',
}

export function MapView({ incidents, onPick }: { incidents: Incident[]; onPick?: (id: string) => void }) {
  return (
    <div className="h-[380px] w-full rounded-xl overflow-hidden">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          defaultState={{ center: [55.03, 82.92], zoom: 11 }}
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
