import { useEffect, useState } from 'react'
import type { LiveTransportRoute } from '../types'

export const useLiveTransportRoutes = () => {
  const [liveRoutes, setLiveRoutes] = useState<LiveTransportRoute[]>([])

  useEffect(() => {
    let cancelled = false

    const loadLiveRoutes = async () => {
      try {
        const response = await fetch('/api/routes', { cache: 'no-store' })
        if (!response.ok) throw new Error(`routes feed failed: ${response.status}`)
        const routes = (await response.json()) as LiveTransportRoute[]
        if (!cancelled) setLiveRoutes(routes)
      } catch {
        if (!cancelled) setLiveRoutes([])
      }
    }

    void loadLiveRoutes()

    return () => {
      cancelled = true
    }
  }, [])

  return liveRoutes
}
