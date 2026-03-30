import { useEffect, useRef, useState } from 'react'
import { selectVisibleMapLabelIds } from '../../../lib/mapLabelDeclutter'
import { getModerateClusterZoom } from '../../../lib/mapClusterZoom'
import { districts } from '../../../mocks/data'
import type { TransitStop, TransportVehicle } from '../types'

type YMapsEventManager = {
  add: (eventName: string, handler: (event: { get: (key: string) => unknown }) => void) => void
  remove: (eventName: string, handler: (event: { get: (key: string) => unknown }) => void) => void
}

type YMapsPlacemark = {
  geometry?: {
    setCoordinates: (coordinates: [number, number]) => void
  }
  properties: {
    set: (key: string, value: unknown) => void
  }
  events: YMapsEventManager
}

type YMapsClusterer = {
  add: (geoObjects: YMapsPlacemark[] | YMapsPlacemark) => void
  removeAll: () => void
  events: YMapsEventManager
}

type YMapsGeoObject = YMapsPlacemark | YMapsClusterer

type YMapsMap = {
  setCenter: (center: [number, number], zoom?: number, options?: { duration?: number }) => void
  destroy: () => void
  events: YMapsEventManager
  geoObjects: {
    add: (geoObject: YMapsGeoObject) => void
    remove: (geoObject: YMapsGeoObject) => void
  }
}

type PlacemarkOptions = {
  preset?: string
  iconColor?: string
  openBalloonOnClick?: boolean
  zIndex?: number
}

type PlacemarkProperties = {
  hintContent?: string
  balloonContentHeader?: string
  balloonContentBody?: string
  iconCaption?: string
}

type YMapsApi = {
  ready: (callback: () => void) => void
  Map: new (
    element: HTMLElement,
    state: { center: [number, number]; zoom: number },
    options?: Record<string, unknown>,
  ) => YMapsMap
  Placemark: new (
    geometry: [number, number],
    properties?: PlacemarkProperties,
    options?: PlacemarkOptions,
  ) => YMapsPlacemark
  Clusterer: new (options?: Record<string, unknown>) => YMapsClusterer
}

const mapOptions: Record<string, unknown> & { yandexMapType: 'transit' } = {
  suppressMapOpenBlock: true,
  yandexMapType: 'transit',
}

const stopClustererOptions = {
  groupByCoordinates: false,
  gridSize: 100,
  clusterDisableClickZoom: true,
  clusterOpenBalloonOnClick: false,
  preset: 'islands#invertedBlueClusterIcons',
}

const zoomOutForOverview = (zoom: number): number => Math.max(0, zoom - 2)

let yandexMapsApiPromise: Promise<YMapsApi> | null = null

const hasCoordinates = (stop: TransitStop): stop is TransitStop & { coordinates: [number, number] } =>
  Array.isArray(stop.coordinates)

const getBoundsState = (stops: TransitStop[], selectedStop?: TransitStop) => {
  const visibleStops = stops.filter(hasCoordinates)
  if (selectedStop?.coordinates) return { center: selectedStop.coordinates, zoom: 14 }
  if (visibleStops.length === 0) return { center: [55.03, 82.92] as [number, number], zoom: zoomOutForOverview(10) }
  if (visibleStops.length === 1) return { center: visibleStops[0].coordinates, zoom: zoomOutForOverview(13) }

  const latitudes = visibleStops.map((stop) => stop.coordinates[0])
  const longitudes = visibleStops.map((stop) => stop.coordinates[1])
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)
  const spread = Math.max(maxLat - minLat, maxLon - minLon)
  const zoom = spread > 0.2 ? 10 : spread > 0.1 ? 11 : spread > 0.04 ? 12 : 13

  return {
    center: [
      Number(((minLat + maxLat) / 2).toFixed(6)),
      Number(((minLon + maxLon) / 2).toFixed(6)),
    ] as [number, number],
    zoom: zoomOutForOverview(zoom),
  }
}

const getMapState = (stops: TransitStop[], selectedDistrict?: string, selectedStop?: TransitStop) => {
  if (selectedDistrict && !selectedStop) {
    const districtCenter = districts.find(
      (district) => district.name === selectedDistrict || district.id === selectedDistrict,
    )?.center
    if (districtCenter) return { center: districtCenter, zoom: zoomOutForOverview(12) }
  }

  return getBoundsState(stops, selectedStop)
}

const loadYandexMapsApi = (): Promise<YMapsApi> => {
  const win = window as unknown as Window & { ymaps?: YMapsApi }
  if (win.ymaps) return Promise.resolve(win.ymaps)
  if (yandexMapsApiPromise) return yandexMapsApiPromise

  yandexMapsApiPromise = new Promise((resolve, reject) => {
    const scriptId = 'sigma-yandex-maps-api'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim()
    const scriptSrc = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${apiKey ? `&apikey=${apiKey}` : ''}`

    const onReady = () => {
      if (!win.ymaps) {
        yandexMapsApiPromise = null
        reject(new Error('Yandex Maps API is unavailable'))
        return
      }

      win.ymaps.ready(() => resolve(win.ymaps!))
    }

    const onError = () => {
      yandexMapsApiPromise = null
      reject(new Error('Failed to load Yandex Maps API'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', onReady, { once: true })
      existingScript.addEventListener('error', onError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = scriptSrc
    script.async = true
    script.onload = onReady
    script.onerror = onError
    document.head.appendChild(script)
  })

  return yandexMapsApiPromise
}

const getYMapsApi = (): YMapsApi | undefined =>
  (window as unknown as Window & { ymaps?: YMapsApi }).ymaps

const formatStopLabel = (stop: TransitStop): string =>
  stop.name.length > 22 ? `${stop.name.slice(0, 21).trimEnd()}…` : stop.name

const buildStopBalloonBody = (stop: TransitStop): string => [
  `<div><b>Район:</b> ${stop.district}</div>`,
  `<div><b>Улица:</b> ${stop.street || '—'}</div>`,
  `<div><b>Павильон:</b> ${stop.hasPavilion ? 'есть' : 'нет'}</div>`,
  `<div><b>Маршруты:</b> ${stop.routesParsed.map((route) => route.number).join(', ') || '—'}</div>`,
].join('')

export const useYandexTransportMap = ({
  stops,
  selectedStop,
  selectedDistrict,
  vehicles,
  onSelectStop,
}: {
  stops: TransitStop[]
  selectedStop?: TransitStop
  selectedDistrict?: string
  vehicles: TransportVehicle[]
  onSelectStop: (stop: TransitStop) => void
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMapsMap | null>(null)
  const stopClustererRef = useRef<YMapsClusterer | null>(null)
  const vehiclesRef = useRef<Map<string, YMapsPlacemark>>(new Map())
  const selectedStopRef = useRef<YMapsPlacemark | null>(null)
  const initialStateRef = useRef({ stops, selectedStop, selectedDistrict })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapZoom, setMapZoom] = useState(
    getMapState(initialStateRef.current.stops, initialStateRef.current.selectedDistrict, initialStateRef.current.selectedStop).zoom,
  )
  const mapZoomRef = useRef(mapZoom)

  useEffect(() => {
    mapZoomRef.current = mapZoom
  }, [mapZoom])

  useEffect(() => {
    let cancelled = false
    const vehiclesMap = vehiclesRef.current
    const handleBoundsChange = (event: { get: (key: string) => unknown }) => {
      const nextZoom = event.get('newZoom')
      if (typeof nextZoom === 'number') setMapZoom(nextZoom)
    }
    const handleClusterClick = (event: { get: (key: string) => unknown }) => {
      const map = mapRef.current
      if (!map) return

      const rawCoords = event.get('coords')
      const target = event.get('target') as { geometry?: { getCoordinates?: () => unknown } } | undefined
      const targetCoords = target?.geometry?.getCoordinates?.()
      const nextCenter = Array.isArray(rawCoords)
        ? [Number(rawCoords[0]), Number(rawCoords[1])] as [number, number]
        : Array.isArray(targetCoords)
          ? [Number(targetCoords[0]), Number(targetCoords[1])] as [number, number]
          : undefined
      const nextZoom = getModerateClusterZoom(mapZoomRef.current)

      if (nextCenter) {
        map.setCenter(nextCenter, nextZoom, { duration: 250 })
        setMapZoom(nextZoom)
      }
    }

    void loadYandexMapsApi()
      .then((api) => {
        if (cancelled || mapRef.current || !containerRef.current) return
        const initialState = initialStateRef.current
        mapRef.current = new api.Map(
          containerRef.current,
          getMapState(initialState.stops, initialState.selectedDistrict, initialState.selectedStop),
          mapOptions,
        )
        stopClustererRef.current = new api.Clusterer(stopClustererOptions)
        mapRef.current.geoObjects.add(stopClustererRef.current)
        mapRef.current.events.add('boundschange', handleBoundsChange)
        stopClustererRef.current.events.add('click', handleClusterClick)
        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не удалось загрузить Yandex Maps JS API 2.1.')
      })

    return () => {
      cancelled = true
      mapRef.current?.events.remove('boundschange', handleBoundsChange)
      stopClustererRef.current?.events.remove('click', handleClusterClick)
      for (const placemark of vehiclesMap.values()) {
        mapRef.current?.geoObjects.remove(placemark)
      }
      vehiclesMap.clear()
      if (selectedStopRef.current) {
        mapRef.current?.geoObjects.remove(selectedStopRef.current)
        selectedStopRef.current = null
      }
      if (stopClustererRef.current) {
        stopClustererRef.current.removeAll()
      }
      mapRef.current?.destroy()
      mapRef.current = null
      stopClustererRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    const nextState = getMapState(stops, selectedDistrict, selectedStop)
    setMapZoom(nextState.zoom)
    map.setCenter(nextState.center, nextState.zoom, { duration: 250 })
  }, [mapReady, selectedDistrict, selectedStop, stops])

  useEffect(() => {
    const clusterer = stopClustererRef.current
    if (!mapReady || !clusterer) return

    const ymapsApi = getYMapsApi()
    if (!ymapsApi) return

    const geocodedStops = stops.filter(hasCoordinates).filter((stop) => stop.id !== selectedStop?.id)
    const visibleLabelIds = selectVisibleMapLabelIds(geocodedStops, mapZoom, {
      minZoom: 13,
      getPriority: (stop) => stop.routesParsed.length,
    })

    clusterer.removeAll()

    const stopPlacemarks = geocodedStops.map((stop) => {
      const placemark = new ymapsApi.Placemark(
        stop.coordinates,
        {
          hintContent: stop.name,
          balloonContentHeader: stop.name,
          balloonContentBody: buildStopBalloonBody(stop),
          iconCaption: visibleLabelIds.has(stop.id) ? formatStopLabel(stop) : '',
        },
        {
          preset: stop.hasPavilion ? 'islands#darkBlueCircleDotIcon' : 'islands#blueCircleDotIcon',
          iconColor: stop.hasPavilion ? '#1d4ed8' : '#3b82f6',
          openBalloonOnClick: false,
          zIndex: 1200,
        },
      )

      placemark.events.add('click', () => onSelectStop(stop))
      return placemark
    })

    if (stopPlacemarks.length > 0) clusterer.add(stopPlacemarks)
  }, [mapReady, mapZoom, onSelectStop, selectedStop?.id, stops])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (!selectedStop?.coordinates) {
      if (selectedStopRef.current) {
        map.geoObjects.remove(selectedStopRef.current)
        selectedStopRef.current = null
      }
      return
    }

    const ymapsApi = getYMapsApi()
    if (!ymapsApi) return

    if (!selectedStopRef.current) {
      selectedStopRef.current = new ymapsApi.Placemark(
        selectedStop.coordinates,
        {
          hintContent: selectedStop.name,
          balloonContentHeader: selectedStop.name,
          balloonContentBody: buildStopBalloonBody(selectedStop),
          iconCaption: formatStopLabel(selectedStop),
        },
        {
          preset: 'islands#redCircleIcon',
          iconColor: '#dc2626',
          openBalloonOnClick: false,
          zIndex: 2800,
        },
      )
      selectedStopRef.current.events.add('click', () => onSelectStop(selectedStop))
      map.geoObjects.add(selectedStopRef.current)
      return
    }

    selectedStopRef.current.geometry?.setCoordinates(selectedStop.coordinates)
    selectedStopRef.current.properties.set('hintContent', selectedStop.name)
    selectedStopRef.current.properties.set('balloonContentHeader', selectedStop.name)
    selectedStopRef.current.properties.set('balloonContentBody', buildStopBalloonBody(selectedStop))
    selectedStopRef.current.properties.set('iconCaption', formatStopLabel(selectedStop))
  }, [mapReady, onSelectStop, selectedStop])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    const alive = new Set<string>()

    vehicles.forEach((vehicle) => {
      alive.add(vehicle.id)
      const coordinates: [number, number] = [vehicle.lat, vehicle.lon]
      const existingPlacemark = vehiclesRef.current.get(vehicle.id)
      const ymapsApi = getYMapsApi()

      if (!ymapsApi) return

      if (!existingPlacemark) {
        const placemark = new ymapsApi.Placemark(
          coordinates,
          { hintContent: `Маршрут ${vehicle.route}` },
          { preset: 'islands#orangeCircleDotIcon', iconColor: '#ea580c', zIndex: 2200 },
        )
        vehiclesRef.current.set(vehicle.id, placemark)
        map.geoObjects.add(placemark)
        return
      }

      existingPlacemark.geometry?.setCoordinates(coordinates)
      existingPlacemark.properties.set('hintContent', `Маршрут ${vehicle.route}`)
    })

    for (const [id, placemark] of vehiclesRef.current.entries()) {
      if (alive.has(id)) continue
      map.geoObjects.remove(placemark)
      vehiclesRef.current.delete(id)
    }
  }, [mapReady, vehicles])

  return { containerRef, loadError }
}
