import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnswerPanel } from '../rendering/AnswerPanel'
import { useAskSigmaStore } from '../store'
import type { AskSigmaResult } from '../types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const helpResult: AskSigmaResult = {
  type: 'HELP',
  title: 'Что умеет Сигма',
  hints: [{ question: 'что происходит сейчас', description: 'общая оперативная обстановка' }],
  explain: { dataType: 'pilot', source: 'test', updatedAt: '2026-01-01T00:00:00.000Z' },
}

const unknownResult: AskSigmaResult = {
  type: 'UNKNOWN',
  title: 'Сигма пока не знает эту тему',
  hints: [{ question: 'сводка за 24 часа', description: 'короткая сводка' }],
  explain: { dataType: 'pilot', source: 'test', updatedAt: '2026-01-01T00:00:00.000Z' },
}

let root: Root | null = null
let container: HTMLDivElement | null = null
let initialState = useAskSigmaStore.getState()

const findButtonByText = (text: string): HTMLButtonElement | undefined =>
  Array.from(container?.querySelectorAll('button') ?? []).find((element) => element.textContent?.includes(text)) as HTMLButtonElement | undefined

const renderPanel = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(createElement(MemoryRouter, undefined, createElement(AnswerPanel)))
  })
}

describe('AnswerPanel hint actions', () => {
  beforeEach(async () => {
    initialState = useAskSigmaStore.getState()
    await renderPanel()
  })

  afterEach(async () => {
    await act(async () => {
      root?.unmount()
    })

    container?.remove()
    container = null
    root = null

    useAskSigmaStore.setState(initialState)
  })

  it('submits help hints as a new query when clicked', async () => {
    const ask = vi.fn(() => helpResult)
    await act(async () => {
      useAskSigmaStore.setState({
        isOpen: true,
        isLoading: false,
        lastResult: helpResult,
        ask,
      })
    })

    const hintButton = findButtonByText('что происходит сейчас')
    if (!hintButton) throw new Error('Help hint button not found')

    await act(async () => {
      hintButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(ask).toHaveBeenCalledWith('что происходит сейчас')
  })

  it('submits unknown hints as a new query when clicked', async () => {
    const ask = vi.fn(() => unknownResult)
    await act(async () => {
      useAskSigmaStore.setState({
        isOpen: true,
        isLoading: false,
        lastResult: unknownResult,
        ask,
      })
    })

    const hintButton = findButtonByText('сводка за 24 часа')
    if (!hintButton) throw new Error('Unknown hint button not found')

    await act(async () => {
      hintButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(ask).toHaveBeenCalledWith('сводка за 24 часа')
  })
})
