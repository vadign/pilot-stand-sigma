import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAskSigmaStore } from '../store'
import { useVoiceInput } from '../voice/useVoiceInput'

interface MockRecognitionInstance {
  abort: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  continuous = false
  interimResults = false
  lang = ''
  onend = null
  onerror = null
  onresult = null
  abort = vi.fn()
  start = vi.fn()
  stop = vi.fn()

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }
}

const speechWindow = window as Window & { webkitSpeechRecognition?: typeof MockSpeechRecognition }

const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
const originalWebkitSpeechRecognition = speechWindow.webkitSpeechRecognition

let hidden = false
let visibilityState: DocumentVisibilityState = 'visible'
let root: Root | null = null
let container: HTMLDivElement | null = null
let latestApi: ReturnType<typeof useVoiceInput> | null = null

const setVisibility = (nextState: DocumentVisibilityState) => {
  visibilityState = nextState
  hidden = nextState !== 'visible'
}

const VoiceHarness = ({ onReady }: { onReady: (api: ReturnType<typeof useVoiceInput>) => void }) => {
  const api = useVoiceInput()

  useEffect(() => {
    onReady(api)
  }, [api, onReady])

  return null
}

const mountHook = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(createElement(VoiceHarness, { onReady: (api) => { latestApi = api } }))
  })
}

const startListening = async (): Promise<MockRecognitionInstance> => {
  if (!latestApi) throw new Error('Voice API is not mounted')

  await act(async () => {
    latestApi?.start()
  })

  const recognition = MockSpeechRecognition.instances.at(-1)
  if (!recognition) throw new Error('SpeechRecognition was not created')

  return recognition
}

describe('useVoiceInput', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    MockSpeechRecognition.instances = []
    latestApi = null
    setVisibility('visible')

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    })

    speechWindow.webkitSpeechRecognition = MockSpeechRecognition
    useAskSigmaStore.setState({ voiceState: 'idle', error: undefined, input: '' })

    await mountHook()
  })

  afterEach(async () => {
    await act(async () => {
      root?.unmount()
    })

    container?.remove()
    container = null
    root = null
    latestApi = null

    if (originalHiddenDescriptor) Object.defineProperty(document, 'hidden', originalHiddenDescriptor)
    if (originalVisibilityDescriptor) Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
    if (originalWebkitSpeechRecognition) speechWindow.webkitSpeechRecognition = originalWebkitSpeechRecognition
    else delete speechWindow.webkitSpeechRecognition

    vi.useRealTimers()
  })

  it('stops recognition when the page blurs and then goes to background', async () => {
    const recognition = await startListening()

    act(() => {
      window.dispatchEvent(new Event('blur'))
      setVisibility('hidden')
      vi.advanceTimersByTime(150)
    })

    expect(recognition.abort).toHaveBeenCalledTimes(1)
    expect(useAskSigmaStore.getState().voiceState).toBe('idle')
  })

  it('keeps recognition active on transient blur while the page stays visible', async () => {
    const recognition = await startListening()

    act(() => {
      window.dispatchEvent(new Event('blur'))
      vi.advanceTimersByTime(150)
    })

    expect(recognition.abort).not.toHaveBeenCalled()
    expect(useAskSigmaStore.getState().voiceState).toBe('listening')
  })
})
