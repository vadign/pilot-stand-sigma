import { create } from 'zustand'
import type {
  PresentationCommandEnvelope,
  PresentationController,
  PresentationScene,
  PresentationSessionInfo,
} from './types'

interface PresentationState {
  session?: PresentationSessionInfo
  lastCommand?: PresentationCommandEnvelope
  connection: 'idle' | 'connecting' | 'connected' | 'error'
  error?: string
  setSnapshot: (session: PresentationSessionInfo) => void
  setScene: (scene: PresentationScene) => void
  setController: (controller?: PresentationController) => void
  setLastCommand: (command?: PresentationCommandEnvelope) => void
  setConnection: (connection: PresentationState['connection']) => void
  setError: (error?: string) => void
  reset: () => void
}

export const usePresentationStore = create<PresentationState>((set) => ({
  connection: 'idle',
  setSnapshot: (session) => set({ session, error: undefined }),
  setScene: (scene) =>
    set((state) => state.session ? { session: { ...state.session, scene }, error: undefined } : state),
  setController: (controller) =>
    set((state) => state.session ? { session: { ...state.session, controller }, error: undefined } : state),
  setLastCommand: (lastCommand) => set({ lastCommand }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error, connection: error ? 'error' : 'idle' }),
  reset: () => set({ session: undefined, lastCommand: undefined, connection: 'idle', error: undefined }),
}))
