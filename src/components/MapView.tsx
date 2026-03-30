import { useEffect, useMemo, useState } from 'react'
import { YMaps, Map, Placemark, Clusterer } from '@pbe/react-yandex-maps'
import type { Incident } from '../types'
import { getIncidentMapPresentation } from '../lib/incidentMapPresentation'
import { selectCriticalAndOnePlannedPerCollisionBucket, stackNearbyPlacemarks } from '../lib/mapPlacemarkStack'
import { selectEmergencyAndTopPlannedByHouses } from '../lib/selectEmergencyAndTopPlannedByHouses'
import { selectVisibleMapLabelIds } from '../lib/mapLabelDeclutter'
import { getModerateClusterZoom } from '../lib/mapClusterZoom'

const severityColor: Record<Incident['severity'], string> = {
  низкий: '#3b82f6',
  средний: '#0ea5e9',
  высокий: '#f59e0b',
  критический: '#dc2626',
}

const zoomOutForOverview = (zoom: number): number => Math.max(0, zoom - 2)
const minZoomForLabels = 13
const clustererOptions = {
  groupByCoordinates: false,
  gridSize: 96,
  clusterDisableClickZoom: true,
  clusterOpenBalloonOnClick: false,
  preset: 'islands#invertedRedClusterIcons',
}

const incidentPriority = (incident: Incident): number => {
  if (incident.severity === 'критический') return 4
  if (incident.severity === 'высокий') return 3
  if (incident.severity === 'средний') return 2
  return 1
}

export function MapView({
  incidents,
  onPick,
  overlapMode = 'stack',
  plannedTopByHousesLimit,
  selectedIncidentId,
}: {
  incidents: Incident[]
  onPick?: (id: string) => void
  overlapMode?: 'stack' | 'critical-and-planned'
  plannedTopByHousesLimit?: number
  selectedIncidentId?: string
}) {
  const [activeIncidentId, setActiveIncidentId] = useState<string | undefined>(selectedIncidentId)
  const mapIncidents = useMemo(() =>
    typeof plannedTopByHousesLimit === 'number'
      ? selectEmergencyAndTopPlannedByHouses(incidents, plannedTopByHousesLimit)
      : incidents
  , [incidents, plannedTopByHousesLimit])

  const initialMapState = useMemo(() => {
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
  const [mapState, setMapState] = useState(initialMapState)

  useEffect(() => {
    setMapState(initialMapState)
  }, [initialMapState])

  useEffect(() => {
    setActiveIncidentId((current) =>
      selectedIncidentId ?? (current && mapIncidents.some((incident) => incident.id === current) ? current : undefined),
    )
  }, [mapIncidents, selectedIncidentId])

  const visibleIncidents = useMemo(() =>
    overlapMode === 'critical-and-planned'
      ? selectCriticalAndOnePlannedPerCollisionBucket(mapIncidents, mapState.zoom)
      : mapIncidents
  , [mapIncidents, mapState.zoom, overlapMode])

  const showClusters = mapState.zoom <= 12
  const labelIds = useMemo(() => selectVisibleMapLabelIds(visibleIncidents, mapState.zoom, {
    selectedId: activeIncidentId,
    minZoom: minZoomForLabels,
    getPriority: incidentPriority,
  }), [activeIncidentId, mapState.zoom, visibleIncidents])
  const stackedPlacemarks = useMemo(() => stackNearbyPlacemarks(visibleIncidents, mapState.zoom).map((incident) => ({
    incident,
    presentation: getIncidentMapPresentation(incident),
  })), [visibleIncidents, mapState.zoom])
  const clusterPlacemarks = useMemo(() => visibleIncidents.map((incident) => ({
    incident,
    presentation: getIncidentMapPresentation(incident),
  })), [visibleIncidents])

  const escapeHtml = (value: string): string => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

  const handleClusterClick = (event: { get: (key: string) => unknown }) => {
    const rawCoords = event.get('coords')
    const target = event.get('target') as { geometry?: { getCoordinates?: () => unknown } } | undefined
    const targetCoords = target?.geometry?.getCoordinates?.()
    const nextCenter = Array.isArray(rawCoords)
      ? [Number(rawCoords[0]), Number(rawCoords[1])] as [number, number]
      : Array.isArray(targetCoords)
        ? [Number(targetCoords[0]), Number(targetCoords[1])] as [number, number]
        : mapState.center

    setMapState((current) => ({
      center: nextCenter,
      zoom: getModerateClusterZoom(current.zoom),
    }))
  }

  return (
    <div className="h-[380px] w-full rounded-xl overflow-hidden">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          state={mapState}
          width="100%"
          height="100%"
          options={{ suppressMapOpenBlock: true }}
          onBoundsChange={(event: { get: (key: string) => [number, number] | number | undefined }) => {
            const nextCenter = event.get('newCenter')
            const nextZoom = event.get('newZoom')

            setMapState((current) => ({
              center: Array.isArray(nextCenter) ? [Number(nextCenter[0]), Number(nextCenter[1])] : current.center,
              zoom: typeof nextZoom === 'number' ? nextZoom : current.zoom,
            }))
          }}
        >
          {showClusters ? (
            <Clusterer options={clustererOptions} onClick={handleClusterClick}>
              {clusterPlacemarks.map(({ incident, presentation }) => {
                const isActive = incident.id === activeIncidentId

                return (
                  <Placemark
                    key={incident.id}
                    geometry={incident.coordinates}
                    properties={{
                      balloonContentHeader: escapeHtml(presentation.title),
                      balloonContentBody: presentation.bodyRows.map((row) => `<div><b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value)}</div>`).join(''),
                      balloonContentFooter: escapeHtml(presentation.footer),
                      hintContent: escapeHtml(presentation.hint),
                      iconCaption: labelIds.has(incident.id) ? escapeHtml(presentation.caption) : '',
                    }}
                    options={{
                      preset: isActive ? 'islands#circleIcon' : 'islands#circleDotIcon',
                      iconColor: severityColor[incident.severity],
                      zIndex: isActive ? 2400 : 1200,
                    }}
                    modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                    onClick={() => {
                      setActiveIncidentId(incident.id)
                      onPick?.(incident.id)
                    }}
                  />
                )
              })}
            </Clusterer>
          ) : (
            stackedPlacemarks.map(({ incident, presentation }) => {
              const isActive = incident.id === activeIncidentId

              return (
                <Placemark
                  key={incident.id}
                  geometry={incident.displayCoordinates}
                  properties={{
                    balloonContentHeader: escapeHtml(presentation.title),
                    balloonContentBody: presentation.bodyRows.map((row) => `<div><b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value)}</div>`).join(''),
                    balloonContentFooter: escapeHtml(presentation.footer),
                    hintContent: escapeHtml(presentation.hint),
                    iconCaption: labelIds.has(incident.id) ? escapeHtml(presentation.caption) : '',
                  }}
                  options={{
                    preset: isActive ? 'islands#circleIcon' : 'islands#circleDotIcon',
                    iconColor: severityColor[incident.severity],
                    iconOffset: incident.displayOffset,
                    zIndex: isActive ? 2400 : 1200,
                  }}
                  modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                  onClick={() => {
                    setActiveIncidentId(incident.id)
                    onPick?.(incident.id)
                  }}
                />
              )
            })
          )}
        </Map>
      </YMaps>
    </div>
  )
}
