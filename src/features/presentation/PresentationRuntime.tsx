import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildPresentationApiUrl } from './apiBase'
import { fetchPresentationSessionInfo } from './api'
import { getPresentationClientId } from './clientId'
import { usePresentationStore } from './store'
import type {
  PresentationCommandEnvelope,
  PresentationController,
  PresentationScene,
  PresentationSessionInfo,
} from './types'
import {
  buildDisplayRoute,
  buildPresentationRoute,
  getPresentationSessionId,
  isPresentationPageMode,
} from './url'

const parseEventPayload = <T,>(event: MessageEvent<string>): T => JSON.parse(event.data) as T

export const PresentationRuntime = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const setSnapshot = usePresentationStore((state) => state.setSnapshot)
  const setScene = usePresentationStore((state) => state.setScene)
  const setController = usePresentationStore((state) => state.setController)
  const setLastCommand = usePresentationStore((state) => state.setLastCommand)
  const setConnection = usePresentationStore((state) => state.setConnection)
  const setError = usePresentationStore((state) => state.setError)
  const reset = usePresentationStore((state) => state.reset)
  const session = usePresentationStore((state) => state.session)
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const sessionId = getPresentationSessionId(searchParams)
  const isDisplayScreen = location.pathname === '/display'
  const isPresentationDisplayMode = Boolean(sessionId) && (isDisplayScreen || isPresentationPageMode(searchParams))
  const displayClientId = useMemo(() => getPresentationClientId('display'), [])

  useEffect(() => {
    if (!isPresentationDisplayMode || !sessionId) {
      reset()
      return
    }

    let isActive = true
    setConnection('connecting')
    setError(undefined)

    void fetchPresentationSessionInfo({ sid: sessionId, clientId: displayClientId, role: 'display' })
      .then((info) => {
        if (!isActive) return
        setSnapshot(info)
      })
      .catch((error) => {
        if (!isActive) return
        setError(error instanceof Error ? error.message : String(error))
      })

    const stream = new EventSource(buildPresentationApiUrl(`/session/${sessionId}/stream`))

    const onSnapshot = (event: MessageEvent<string>) => {
      setSnapshot(parseEventPayload<PresentationSessionInfo>(event))
    }
    const onScene = (event: MessageEvent<string>) => {
      setScene(parseEventPayload<PresentationScene>(event))
    }
    const onController = (event: MessageEvent<string>) => {
      setController(parseEventPayload<PresentationController | undefined>(event))
    }
    const onCommand = (event: MessageEvent<string>) => {
      setLastCommand(parseEventPayload<PresentationCommandEnvelope>(event))
    }

    stream.addEventListener('snapshot', onSnapshot as EventListener)
    stream.addEventListener('scene', onScene as EventListener)
    stream.addEventListener('controller', onController as EventListener)
    stream.addEventListener('command', onCommand as EventListener)
    stream.addEventListener('heartbeat', () => {
      setConnection('connected')
    })
    stream.onopen = () => {
      setConnection('connected')
      setError(undefined)
    }
    stream.onerror = () => {
      if (!isActive) return
      setConnection('connecting')
    }

    return () => {
      isActive = false
      stream.close()
    }
  }, [
    displayClientId,
    isPresentationDisplayMode,
    reset,
    sessionId,
    setConnection,
    setController,
    setError,
    setLastCommand,
    setScene,
    setSnapshot,
  ])

  useEffect(() => {
    if (!isPresentationDisplayMode || !sessionId || !session) return

    if (session.scene.type === 'page') {
      const target = buildPresentationRoute(session.scene.route, sessionId)
      const current = `${location.pathname}${location.search}${location.hash}`
      if (current !== target) {
        navigate(target, { replace: true })
      }
      return
    }

    if (session.scene.type === 'idle' && !isDisplayScreen) {
      navigate(buildDisplayRoute(sessionId), { replace: true })
    }
  }, [
    isDisplayScreen,
    isPresentationDisplayMode,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    session,
    sessionId,
  ])

  return null
}
