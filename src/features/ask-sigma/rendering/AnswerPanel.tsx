import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AskSigmaBar } from '../AskSigmaBar'
import { useAskSigmaStore } from '../store'
import type { AskSigmaAction } from '../types'
import { ResultRenderer } from './resultRenderers/ResultRenderer'

export const AnswerPanel = () => {
  const navigate = useNavigate()
  const result = useAskSigmaStore((s) => s.lastResult)
  const isOpen = useAskSigmaStore((s) => s.isOpen)
  const close = useAskSigmaStore((s) => s.close)
  const isLoading = useAskSigmaStore((s) => s.isLoading)
  const ask = useAskSigmaStore((s) => s.ask)

  const handleAction = (action: AskSigmaAction) => {
    const { route, district } = action
    if (!route) return
    if (district && route === '/operations') {
      navigate(`/operations?district=${district}`)
      return
    }
    navigate(route)
  }

  const handleHintSelect = (question: string) => {
    const nextResult = ask(question)
    if (nextResult.type !== 'NAVIGATE') return

    const route = nextResult.actions?.[0]?.route
    const district = nextResult.actions?.[0]?.district
    handleAction({ label: 'Открыть', route, district })
  }

  if (!isOpen) return null

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ответ Сигмы</h2>
          <button onClick={close} className="rounded border p-1"><X size={16} /></button>
        </div>
        <AskSigmaBar className="mb-0" />
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isLoading && <div className="rounded border p-3 text-sm">Обрабатываю запрос…</div>}
        {!isLoading && !result && <div className="rounded border p-3 text-sm">Задайте вопрос в поле «Спросите Сигму».</div>}
        {!isLoading && result && <ResultRenderer result={result} onAction={handleAction} onHintSelect={handleHintSelect} />}
      </div>
    </aside>
  )
}
