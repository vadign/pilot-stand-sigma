import { Mic, MicOff, SendHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAskSigmaStore } from './store'
import { useVoiceInput } from './voice/useVoiceInput'

const placeholders = {
  мэр: 'Что сейчас происходит?',
  диспетчер: 'Что сейчас происходит?',
  аналитик: 'Что сейчас происходит?',
} as const

const quickExamples = {
  мэр: ['Что ты умеешь?', 'Что происходит на дорогах?', 'События в Советском районе'],
  диспетчер: ['Что ты умеешь?', 'Критичные инциденты по отоплению', 'Что происходит на дорогах?', 'События в Советстком районе'],
  аналитик: ['Что ты умеешь?', 'Динамика отключений за неделю', 'Что происходит на дорогах?', 'События в Советском районе'],
} as const

export const AskSigmaBar = () => {
  const navigate = useNavigate()
  const input = useAskSigmaStore((s) => s.input)
  const setInput = useAskSigmaStore((s) => s.setInput)
  const ask = useAskSigmaStore((s) => s.ask)
  const role = useAskSigmaStore((s) => s.role)
  const voiceState = useAskSigmaStore((s) => s.voiceState)
  const { supported, start, stop } = useVoiceInput()
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(timer)
  }, [toast])

  const submit = (value = input) => {
    const query = value.trim()
    if (!query) return

    const result = ask(query)
    if (result.type === 'NAVIGATE') {
      const route = result.actions?.[0]?.route
      if (route) { navigate(route); setToast('Переход выполнен') }
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
          placeholder={placeholders[role] ?? 'Спросите Сигму'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        <button onClick={() => submit()} className="rounded-xl bg-blue-600 px-3 text-white"><SendHorizontal size={16} /></button>
        <button
          onClick={() => (voiceState === 'listening' ? stop() : start())}
          className="rounded-xl border px-3"
          title={supported ? 'Голосовой ввод' : 'Не поддерживается'}
        >
          {voiceState === 'listening' ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>
      <div className="mt-2">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Быстрые вопросы</div>
        <div className="flex flex-wrap gap-2">
          {(quickExamples[role] ?? quickExamples.мэр).map((example) => (
            <button
              key={example}
              onClick={() => submit(example)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
      {toast && <div className="mt-1 text-xs text-emerald-600">{toast}</div>}
      <div className="mt-1 text-xs text-slate-500">
        {voiceState === 'listening' && 'Слушаю…'}
        {voiceState === 'processing' && 'Обрабатываю…'}
        {voiceState === 'error' && 'Ошибка голосового ввода'}
        {voiceState === 'unsupported' && 'Голосовой ввод не поддерживается в этом браузере'}
      </div>
    </div>
  )
}
