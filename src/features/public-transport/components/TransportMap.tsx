import { useYandexTransportMap } from '../hooks/useYandexTransportMap'
import type { TransitStop, TransportVehicle } from '../types'

export const TransportMap = ({
  stops,
  selectedStop,
  selectedDistrict,
  vehicles,
  onSelectStop,
}: {
  stops: TransitStop[]
  selectedStop?: TransitStop
  selectedDistrict?: string
  selectedRoute?: string
  liveRoutes?: never
  vehicles: TransportVehicle[]
  onSelectStop: (stop: TransitStop) => void
}) => {
  const { containerRef, loadError } = useYandexTransportMap({
    stops,
    selectedStop,
    selectedDistrict,
    vehicles,
    onSelectStop,
  })

  return (
    <div className="relative h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      <div ref={containerRef} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-3 rounded-xl border border-red-200 bg-white/95 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}
    </div>
  )
}
