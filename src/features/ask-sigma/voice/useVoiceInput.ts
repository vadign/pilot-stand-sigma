import { useCallback, useMemo, useRef } from 'react'
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
  start(): void
  stop(): void
}
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

const getSpeechRecognition = (): BrowserSpeechRecognitionConstructor | null => {
  const speechWindow = window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export const useVoiceInput = () => {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const ask = useAskSigmaStore((s) => s.ask)
  const setVoiceState = useAskSigmaStore((s) => s.setVoiceState)
  const voiceState = useAskSigmaStore((s) => s.voiceState)

  const supported = useMemo(() => Boolean(getSpeechRecognition()), [])

  const start = useCallback(() => {
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
      if (clean) ask(clean)
      setVoiceState('idle')
    }

    recognition.onerror = (event) => {
      setVoiceState('error', `Ошибка микрофона: ${event.error}`)
    }

    recognition.onend = () => {
      setVoiceState('idle')
    }

    recognitionRef.current = recognition
    setVoiceState('listening')
    recognition.start()
  }, [ask, setVoiceState])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setVoiceState('idle')
  }, [setVoiceState])

  return { supported, voiceState, start, stop }
}
