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

const sceneRequestedAt = (scene?: PresentationScene): number => {
  if (!scene) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(scene.requestedAt)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

export const usePresentationStore = create<PresentationState>((set) => ({
  connection: 'idle',
  setSnapshot: (session) =>
    set((state) => {
      const current = state.session
      if (!current || current.sid !== session.sid) {
        return { session, error: undefined }
      }

      if (sceneRequestedAt(current.scene) <= sceneRequestedAt(session.scene)) {
        return { session, error: undefined }
      }

      return {
        session: {
          ...session,
          scene: current.scene,
          previousScene: current.previousScene ?? session.previousScene,
          historyDepth: Math.max(current.historyDepth, session.historyDepth),
          controller: current.controller ?? session.controller,
        },
        error: undefined,
      }
    }),
  setScene: (scene) =>
    set((state) => state.session ? { session: { ...state.session, scene }, error: undefined } : state),
  setController: (controller) =>
    set((state) => state.session ? { session: { ...state.session, controller }, error: undefined } : state),
  setLastCommand: (lastCommand) => set({ lastCommand }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error, connection: error ? 'error' : 'idle' }),
  reset: () => set({ session: undefined, lastCommand: undefined, connection: 'idle', error: undefined }),
}))
