import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAskSigmaStore } from '../store'
import { stripWakeWord } from './voiceRegex'

interface BrowserSpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}
interface BrowserSpeechRecognitionErrorEvent extends Event { readonly error: string }
interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: ((this: BrowserSpeechRecognition, ev: Event) => unknown) | null
  onerror: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionErrorEvent) => unknown) | null
  onresult: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionEvent) => unknown) | null
  abort?(): void
  start(): void
  stop(): void
}
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

const getSpeechRecognition = (): BrowserSpeechRecognitionConstructor | null => {
  const speechWindow = window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export const useVoiceInput = (options?: { onTranscript?: (query: string) => void }) => {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const backgroundCheckTimeoutRef = useRef<number | null>(null)
  const ask = useAskSigmaStore((s) => s.ask)
  const setVoiceState = useAskSigmaStore((s) => s.setVoiceState)
  const voiceState = useAskSigmaStore((s) => s.voiceState)

  const supported = useMemo(() => Boolean(getSpeechRecognition()), [])

  const clearBackgroundCheck = useCallback(() => {
    if (backgroundCheckTimeoutRef.current === null) return
    window.clearTimeout(backgroundCheckTimeoutRef.current)
    backgroundCheckTimeoutRef.current = null
  }, [])

  const stopRecognition = useCallback((immediate = false) => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setVoiceState('idle')
      return
    }

    recognitionRef.current = null
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null

    if (immediate && recognition.abort) recognition.abort()
    else recognition.stop()

    setVoiceState('idle')
  }, [setVoiceState])

  const stopRecognitionIfActive = useCallback((immediate = false) => {
    if (!recognitionRef.current) return
    stopRecognition(immediate)
  }, [stopRecognition])

  const start = useCallback(() => {
    if (voiceState === 'listening') return

    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      setVoiceState('unsupported', 'Web Speech API не поддерживается')
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'ru-RU'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      setVoiceState('processing')
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      const clean = stripWakeWord(transcript)
      if (clean) {
        if (options?.onTranscript) options.onTranscript(clean)
        else ask(clean)
      }
      setVoiceState('idle')
    }

    recognition.onerror = (event) => {
      recognitionRef.current = null
      setVoiceState('error', `Ошибка микрофона: ${event.error}`)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setVoiceState('idle')
    }

    recognitionRef.current = recognition
    setVoiceState('listening')
    recognition.start()
  }, [ask, options, setVoiceState, voiceState])

  const stop = useCallback(() => {
    stopRecognition(false)
  }, [stopRecognition])

  useEffect(() => {
    const isDocumentBackgrounded = () => document.hidden || document.visibilityState !== 'visible'

    const handleVisibilityChange = () => {
      clearBackgroundCheck()
      if (isDocumentBackgrounded()) stopRecognitionIfActive(true)
    }

    const handleWindowBlur = () => {
      clearBackgroundCheck()
      // Mobile browsers can emit blur slightly before visibilityState flips to hidden.
      backgroundCheckTimeoutRef.current = window.setTimeout(() => {
        backgroundCheckTimeoutRef.current = null
        if (isDocumentBackgrounded()) stopRecognitionIfActive(true)
      }, 150)
    }

    const handlePageHide = () => {
      clearBackgroundCheck()
      stopRecognitionIfActive(true)
    }

    const pageLifecycleDocument = document as Document & {
      addEventListener: Document['addEventListener'] & ((type: 'freeze', listener: EventListenerOrEventListenerObject) => void)
      removeEventListener: Document['removeEventListener'] & ((type: 'freeze', listener: EventListenerOrEventListenerObject) => void)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('pagehide', handlePageHide)
    pageLifecycleDocument.addEventListener('freeze', handlePageHide)

    return () => {
      clearBackgroundCheck()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('pagehide', handlePageHide)
      pageLifecycleDocument.removeEventListener('freeze', handlePageHide)
      stopRecognitionIfActive(true)
    }
  }, [clearBackgroundCheck, stopRecognitionIfActive])

  return { supported, voiceState, start, stop }
}
