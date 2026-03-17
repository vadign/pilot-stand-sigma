import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAskSigmaStore } from '../store'
import { ResultRenderer } from './resultRenderers/ResultRenderer'

export const AnswerPanel = () => {
  const navigate = useNavigate()
  const result = useAskSigmaStore((s) => s.lastResult)
  const isOpen = useAskSigmaStore((s) => s.isOpen)
  const close = useAskSigmaStore((s) => s.close)
  const isLoading = useAskSigmaStore((s) => s.isLoading)

  if (!isOpen) return null

  return (
    <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Ответ Сигмы</h2>
        <button onClick={close} className="rounded border p-1"><X size={16} /></button>
      </div>
      {isLoading && <div className="rounded border p-3 text-sm">Обрабатываю запрос…</div>}
      {!isLoading && !result && <div className="rounded border p-3 text-sm">Задайте вопрос в поле «Спросите Сигму».</div>}
      {!isLoading && result && <ResultRenderer result={result} onAction={(route, district) => {
        if (!route) return
        if (district && route === '/operations') {
          navigate(`/operations?district=${district}`)
          return
        }
        navigate(route)
      }} />}
    </aside>
  )
}
