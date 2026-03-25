import { useMemo } from 'react'
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps'
import type { Incident } from '../types'
import { getIncidentMapPresentation } from '../lib/incidentMapPresentation'
import { selectCriticalAndOnePlannedPerCollisionBucket, stackNearbyPlacemarks } from '../lib/mapPlacemarkStack'
import { selectTopIncidentsByHouses } from '../lib/selectTopIncidentsByHouses'

const severityColor: Record<Incident['severity'], string> = {
  низкий: '#3b82f6',
  средний: '#0ea5e9',
  высокий: '#f59e0b',
  критический: '#dc2626',
}

const zoomOutForOverview = (zoom: number): number => Math.max(0, zoom - 2)

export function MapView({
  incidents,
  onPick,
  overlapMode = 'stack',
  topByHousesLimit,
}: {
  incidents: Incident[]
  onPick?: (id: string) => void
  overlapMode?: 'stack' | 'critical-and-planned'
  topByHousesLimit?: number
}) {
  const mapIncidents = useMemo(() =>
    topByHousesLimit ? selectTopIncidentsByHouses(incidents, topByHousesLimit) : incidents
  , [incidents, topByHousesLimit])

  const mapState = useMemo(() => {
    if (mapIncidents.length === 0) {
      return { center: [55.03, 82.98] as [number, number], zoom: zoomOutForOverview(10) }
    }

    if (mapIncidents.length === 1) {
      return { center: mapIncidents[0].coordinates, zoom: zoomOutForOverview(13) }
    }

    const latitudes = mapIncidents.map((incident) => incident.coordinates[0])
    const longitudes = mapIncidents.map((incident) => incident.coordinates[1])
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
      zoom: zoomOutForOverview(zoom),
    }
  }, [mapIncidents])

  const visibleIncidents = useMemo(() =>
    overlapMode === 'critical-and-planned'
      ? selectCriticalAndOnePlannedPerCollisionBucket(mapIncidents, mapState.zoom)
      : mapIncidents
  , [mapIncidents, mapState.zoom, overlapMode])

  const placemarks = useMemo(() => stackNearbyPlacemarks(visibleIncidents, mapState.zoom).map((incident) => ({
    incident,
    presentation: getIncidentMapPresentation(incident),
  })), [visibleIncidents, mapState.zoom])

  const escapeHtml = (value: string): string => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

  return (
    <div className="h-[380px] w-full rounded-xl overflow-hidden">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          state={mapState}
          width="100%"
          height="100%"
          options={{ suppressMapOpenBlock: true }}
        >
          {placemarks.map(({ incident, presentation }) => (
            <Placemark
              key={incident.id}
              geometry={incident.displayCoordinates}
              properties={{
                balloonContentHeader: escapeHtml(presentation.title),
                balloonContentBody: presentation.bodyRows.map((row) => `<div><b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value)}</div>`).join(''),
                balloonContentFooter: escapeHtml(presentation.footer),
                hintContent: escapeHtml(presentation.hint),
                iconCaption: escapeHtml(presentation.caption),
              }}
              options={{
                preset: 'islands#circleDotIcon',
                iconColor: severityColor[incident.severity],
                iconOffset: incident.displayOffset,
              }}
              modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
              onClick={() => onPick?.(incident.id)}
            />
          ))}
        </Map>
      </YMaps>
    </div>
  )
}
