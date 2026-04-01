import { create } from 'zustand'
import { LocalAskSigmaProvider } from './provider'
import { runAskSigmaQuery } from './runner'
import type { AskSigmaResult, SigmaRole, VoiceState } from './types'

const provider = new LocalAskSigmaProvider()

const LS_ROLE = 'sigma.ask.role'
const LS_DISTRICT = 'sigma.ask.district'
const LS_HISTORY = 'sigma.ask.history'
const LS_RESULT = 'sigma.ask.lastResult'

interface AskSigmaState {
  role: SigmaRole
  district?: string
  input: string
  voiceState: VoiceState
  isOpen: boolean
  isLoading: boolean
  error?: string
  lastResult?: AskSigmaResult
  history: string[]
  setInput: (value: string) => void
  setRole: (role: SigmaRole, district?: string) => void
  setVoiceState: (state: VoiceState, error?: string) => void
  close: () => void
  open: () => void
  ask: (value: string) => AskSigmaResult
}

const readHistory = (): string[] => {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? '[]') as string[] } catch { return [] }
}

export const useAskSigmaStore = create<AskSigmaState>((set, get) => ({
  role: (localStorage.getItem(LS_ROLE) as SigmaRole) ?? 'мэр',
  district: localStorage.getItem(LS_DISTRICT) ?? undefined,
  input: '',
  voiceState: 'idle',
  isOpen: false,
  isLoading: false,
  history: readHistory(),
  lastResult: (() => {
    try { return JSON.parse(localStorage.getItem(LS_RESULT) ?? 'null') as AskSigmaResult | undefined } catch { return undefined }
  })(),
  setInput: (value) => set({ input: value }),
  setRole: (role, district) => {
    localStorage.setItem(LS_ROLE, role)
    if (district) localStorage.setItem(LS_DISTRICT, district)
    set({ role, district })
  },
  setVoiceState: (voiceState, error) => set({ voiceState, error }),
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  ask: (value) => {
    set({ isLoading: true, error: undefined })
    const execution = runAskSigmaQuery({
      query: value,
      provider,
      role: get().role,
      implicitDistrict: get().district,
    })

    if (execution.roleChange) {
      get().setRole(execution.roleChange.role, execution.roleChange.district)
      set({ lastResult: execution.result, isLoading: false, isOpen: true })
      localStorage.setItem(LS_RESULT, JSON.stringify(execution.result))
      return execution.result
    }

    const history = [value, ...get().history.filter((item) => item !== value)].slice(0, 10)
    localStorage.setItem(LS_HISTORY, JSON.stringify(history))
    localStorage.setItem(LS_RESULT, JSON.stringify(execution.result))
    set({ lastResult: execution.result, history, isLoading: false, isOpen: true, input: value })
    return execution.result
  },
}))
