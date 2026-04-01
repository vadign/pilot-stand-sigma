import { beforeEach, describe, expect, it } from 'vitest'
import { LocalAskSigmaProvider } from '../provider'
import { runAskSigmaQuery } from '../runner'
import { useAskSigmaStore } from '../store'

describe('runAskSigmaQuery', () => {
  const provider = new LocalAskSigmaProvider()

  beforeEach(() => {
    useAskSigmaStore.setState({
      role: 'мэр',
      district: undefined,
      input: '',
      voiceState: 'idle',
      isOpen: false,
      isLoading: false,
      error: undefined,
      lastResult: undefined,
      history: [],
    })
    window.localStorage.clear()
  })

  it('returns the same result as the store ask flow without mutating UI state', () => {
    const initialState = useAskSigmaStore.getState()

    const execution = runAskSigmaQuery({
      query: 'сводка за 24 часа',
      provider,
      role: initialState.role,
      implicitDistrict: initialState.district,
    })

    expect(useAskSigmaStore.getState()).toMatchObject(initialState)

    const resultFromStore = useAskSigmaStore.getState().ask('сводка за 24 часа')

    expect(resultFromStore).toMatchObject({
      ...execution.result,
      explain: {
        ...execution.result.explain,
        updatedAt: expect.any(String),
      },
    })

    expect(execution.result.actions?.[0]?.presentationCommand).toMatchObject({
      type: 'OPEN_PAGE',
    })
  })
})
