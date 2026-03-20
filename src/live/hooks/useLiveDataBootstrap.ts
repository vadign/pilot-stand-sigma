import { useEffect } from 'react'
import { getLiveSourceMode, isRuntimeLiveFetchEnabled } from '../config/sourceRegistry'
import { LiveSourceManager } from '../providers/LiveSourceManager'
import { useSigmaStore } from '../../store/useSigmaStore'

const manager = new LiveSourceManager()

export const useLiveDataBootstrap = () => {
  const setLiveLoading = useSigmaStore((state) => state.setLiveLoading)
  const applyLiveBundle = useSigmaStore((state) => state.applyLiveBundle)
  const setLiveError = useSigmaStore((state) => state.setLiveError)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLiveLoading(true)
      try {
        const bundle = await manager.loadBundle({ mode: getLiveSourceMode(), runtimeEnabled: isRuntimeLiveFetchEnabled() })
        if (!cancelled) applyLiveBundle(bundle)
      } catch (error) {
        if (!cancelled) setLiveError(error instanceof Error ? error.message : 'Не удалось загрузить live-данные')
      } finally {
        if (!cancelled) setLiveLoading(false)
      }
    }

    void run()
    const interval = window.setInterval(() => {
      void run()
    }, 5 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [applyLiveBundle, setLiveError, setLiveLoading])
}
