import { useMemo } from 'react'
import { Clusterer, Map, Placemark, YMaps } from '@pbe/react-yandex-maps'
import { districts } from '../../../mocks/data'
import type { TransitStop } from '../types'

const getBoundsState = (stops: TransitStop[], selectedStop?: TransitStop) => {
  const visibleStops = stops.filter((stop) => stop.coordinates)
  if (selectedStop?.coordinates) return { center: selectedStop.coordinates, zoom: 14 }
  if (visibleStops.length === 0) return { center: [55.03, 82.92] as [number, number], zoom: 10 }
  if (visibleStops.length === 1) return { center: visibleStops[0].coordinates!, zoom: 13 }

  const latitudes = visibleStops.map((stop) => stop.coordinates?.[0] ?? 0)
  const longitudes = visibleStops.map((stop) => stop.coordinates?.[1] ?? 0)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)
  const spread = Math.max(maxLat - minLat, maxLon - minLon)
  const zoom = spread > 0.2 ? 10 : spread > 0.1 ? 11 : spread > 0.04 ? 12 : 13

  return {
    center: [Number(((minLat + maxLat) / 2).toFixed(6)), Number(((minLon + maxLon) / 2).toFixed(6))] as [number, number],
    zoom,
  }
}

export const TransportMap = ({
  stops,
  selectedStop,
  selectedDistrict,
  selectedRoute,
  onSelectStop,
}: {
  stops: TransitStop[]
  selectedStop?: TransitStop
  selectedDistrict?: string
  selectedRoute?: string
  onSelectStop: (stop: TransitStop) => void
}) => {
  const state = useMemo(() => {
    if (selectedDistrict && !selectedStop) {
      const districtCenter = districts.find((district) => district.name === selectedDistrict || district.id === selectedDistrict)?.center
      if (districtCenter) return { center: districtCenter, zoom: 12 }
    }
    return getBoundsState(stops, selectedStop)
  }, [selectedDistrict, selectedStop, stops])

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      <YMaps query={{ lang: 'ru_RU', load: 'package.full' }}>
        <Map state={state} width="100%" height="100%" options={{ suppressMapOpenBlock: true }} modules={['control.ZoomControl', 'control.FullscreenControl']}>
          <Clusterer options={{ preset: 'islands#blueClusterIcons', groupByCoordinates: false }}>
            {stops.filter((stop) => stop.coordinates).map((stop) => {
              const isSelected = selectedStop?.id === stop.id
              const isRouteMatch = selectedRoute ? stop.routesParsed.some((route) => route.number === selectedRoute) : false
              return (
                <Placemark
                  key={stop.id}
                  geometry={stop.coordinates!}
                  properties={{
                    balloonContentHeader: stop.name,
                    balloonContentBody: `${stop.street || 'Адрес не указан'} · маршрутов: ${stop.routesParsed.length}`,
                    iconCaption: stop.name,
                  }}
                  options={{
                    preset: isSelected ? 'islands#redIcon' : isRouteMatch ? 'islands#greenCircleIcon' : 'islands#blueCircleDotIcon',
                    iconColor: isSelected ? '#dc2626' : isRouteMatch ? '#16a34a' : '#2563eb',
                  }}
                  modules={['geoObject.addon.balloon']}
                  onClick={() => onSelectStop(stop)}
                />
              )
            })}
          </Clusterer>
        </Map>
      </YMaps>
    </div>
  )
}
