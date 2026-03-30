import { useEffect, useRef, useState } from 'react'
import { districts } from '../../../mocks/data'
import type { TransitStop, TransportVehicle } from '../types'

type YMapsPlacemark = {
  geometry?: {
    setCoordinates: (coordinates: [number, number]) => void
  }
  properties: {
    set: (key: string, value: string) => void
  }
}

type YMapsMap = {
  setCenter: (center: [number, number], zoom?: number, options?: { duration?: number }) => void
  destroy: () => void
  geoObjects: {
    add: (geoObject: YMapsPlacemark) => void
    remove: (geoObject: YMapsPlacemark) => void
  }
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
    properties?: { hintContent?: string },
    options?: { preset?: string },
  ) => YMapsPlacemark
}

const mapOptions: Record<string, unknown> & { yandexMapType: 'transit' } = {
  suppressMapOpenBlock: true,
  yandexMapType: 'transit',
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

export const useYandexTransportMap = ({
  stops,
  selectedStop,
  selectedDistrict,
  vehicles,
}: {
  stops: TransitStop[]
  selectedStop?: TransitStop
  selectedDistrict?: string
  vehicles: TransportVehicle[]
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMapsMap | null>(null)
  const vehiclesRef = useRef<Map<string, YMapsPlacemark>>(new Map())
  const selectedStopRef = useRef<YMapsPlacemark | null>(null)
  const initialStateRef = useRef({ stops, selectedStop, selectedDistrict })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const vehiclesMap = vehiclesRef.current

    void loadYandexMapsApi()
      .then((api) => {
        if (cancelled || mapRef.current || !containerRef.current) return
        const initialState = initialStateRef.current
        mapRef.current = new api.Map(
          containerRef.current,
          getMapState(initialState.stops, initialState.selectedDistrict, initialState.selectedStop),
          mapOptions,
        )
        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не удалось загрузить Yandex Maps JS API 2.1.')
      })

    return () => {
      cancelled = true
      for (const placemark of vehiclesMap.values()) {
        mapRef.current?.geoObjects.remove(placemark)
      }
      vehiclesMap.clear()
      if (selectedStopRef.current) {
        mapRef.current?.geoObjects.remove(selectedStopRef.current)
        selectedStopRef.current = null
      }
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    const nextState = getMapState(stops, selectedDistrict, selectedStop)
    map.setCenter(nextState.center, nextState.zoom, { duration: 250 })
  }, [mapReady, selectedDistrict, selectedStop, stops])

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
          { preset: 'islands#blueCircleDotIcon' },
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

    if (!selectedStopRef.current) {
      const ymapsApi = getYMapsApi()
      if (!ymapsApi) return

      selectedStopRef.current = new ymapsApi.Placemark(
        selectedStop.coordinates,
        { hintContent: selectedStop.name },
        { preset: 'islands#redCircleDotIcon' },
      )
      map.geoObjects.add(selectedStopRef.current)
      return
    }

    selectedStopRef.current.geometry?.setCoordinates(selectedStop.coordinates)
    selectedStopRef.current.properties.set('hintContent', selectedStop.name)
  }, [mapReady, selectedStop])

  return { containerRef, loadError }
}
