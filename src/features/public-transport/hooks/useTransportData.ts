import { useEffect, useState } from 'react'
import type { LiveSourceMode } from '../../../live/types'
import { NovosibirskStopsProvider } from '../providers/NovosibirskStopsProvider'
import { NovosibirskTariffsProvider } from '../providers/NovosibirskTariffsProvider'
import { TransportRealtimeProvider } from '../providers/TransportRealtimeProvider'
import type { PublicTransportBundle } from '../types'

const stopsProvider = new NovosibirskStopsProvider()
const tariffsProvider = new NovosibirskTariffsProvider()
const realtimeProvider = new TransportRealtimeProvider()

export const useTransportData = (sourceMode: LiveSourceMode) => {
  const [bundle, setBundle] = useState<PublicTransportBundle>()
  const [loadedMode, setLoadedMode] = useState<LiveSourceMode>()

  useEffect(() => {
    let cancelled = false

    void Promise.all([stopsProvider.load(sourceMode), tariffsProvider.load(sourceMode)]).then(
      ([stopsResult, faresResult]) => {
        if (cancelled) return
        setBundle({
          mode: sourceMode,
          stops: stopsResult.stops,
          fares: faresResult.fares,
          statuses: [stopsResult.status, faresResult.status],
          realtime: realtimeProvider.getAvailability(),
        })
        setLoadedMode(sourceMode)
      },
    )

    return () => {
      cancelled = true
    }
  }, [sourceMode])

  return { bundle, loading: loadedMode !== sourceMode }
}
