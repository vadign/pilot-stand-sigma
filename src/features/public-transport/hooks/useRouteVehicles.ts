import { useEffect, useMemo, useState } from 'react'
import type { LiveTransportRoute, LiveTransportVehiclesResponse, TransportVehicle } from '../types'

interface VehicleSnapshot {
  key: string
  vehicles: TransportVehicle[]
}

const buildRouteSnapshotKey = (selectedRoute: string, liveRoutes: LiveTransportRoute[]) =>
  `${selectedRoute}:${liveRoutes.map((route) => route.routeId).sort().join(',')}`

export const useRouteVehicles = ({
  liveRoutes,
  selectedRoute,
}: {
  liveRoutes: LiveTransportRoute[]
  selectedRoute?: string
}) => {
  const [snapshot, setSnapshot] = useState<VehicleSnapshot>({ key: '', vehicles: [] })
  const snapshotKey = useMemo(
    () => (selectedRoute && liveRoutes.length > 0 ? buildRouteSnapshotKey(selectedRoute, liveRoutes) : ''),
    [liveRoutes, selectedRoute],
  )

  useEffect(() => {
    if (!selectedRoute || liveRoutes.length === 0) return

    let cancelled = false
    const currentKey = buildRouteSnapshotKey(selectedRoute, liveRoutes)

    const loadVehicles = async () => {
      try {
        const responses = await Promise.all(
          liveRoutes.map(async (route) => {
            const response = await fetch(`/api/vehicles?routeId=${encodeURIComponent(route.routeId)}`, {
              cache: 'no-store',
            })
            if (!response.ok) throw new Error(`vehicles feed failed: ${response.status}`)
            return response.json() as Promise<LiveTransportVehiclesResponse>
          }),
        )

        if (!cancelled) {
          setSnapshot({
            key: currentKey,
            vehicles: responses.flatMap((item) => item.vehicles),
          })
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            key: currentKey,
            vehicles: [],
          })
        }
      }
    }

    void loadVehicles()
    const intervalId = window.setInterval(() => {
      void loadVehicles()
    }, 5_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [liveRoutes, selectedRoute])

  return snapshot.key === snapshotKey ? snapshot.vehicles : []
}
