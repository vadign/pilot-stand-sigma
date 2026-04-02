import { CheckCircle2, Copy, LoaderCircle, QrCode, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Card } from '../../components/ui'
import { createPresentationSession, fetchPresentationSessionInfo } from './api'
import { getPresentationClientId } from './clientId'
import { usePresentationStore } from './store'
import { SessionQrCode } from './SessionQrCode'
import { PRESENTATION_SESSION_PARAM, buildFallbackMobileUrl, getPresentationSessionId } from './url'


const buildDisplaySessionUrl = (sid: string): string => {
  const nextParams = new URLSearchParams(window.location.search)
  nextParams.set(PRESENTATION_SESSION_PARAM, sid)
  return `${window.location.pathname}?${nextParams.toString()}`
}

export default function PresentationDisplayPage() {
  const [searchParams] = useSearchParams()
  const session = usePresentationStore((state) => state.session)
  const setSnapshot = usePresentationStore((state) => state.setSnapshot)
  const connection = usePresentationStore((state) => state.connection)
  const error = usePresentationStore((state) => state.error)
  const setError = usePresentationStore((state) => state.setError)
  const sessionId = useMemo(() => getPresentationSessionId(searchParams), [searchParams])
  const clientId = useMemo(() => getPresentationClientId('display'), [])
  const [creatingSession, setCreatingSession] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const mobileUrl = useMemo(
    () => session?.mobileUrl ?? (sessionId ? buildFallbackMobileUrl(sessionId) : undefined),
    [session?.mobileUrl, sessionId],
  )

  useEffect(() => {
    if (sessionId || creatingSession) return

    let isMounted = true
    setCreatingSession(true)

    void createPresentationSession()
      .then((response) => {
        if (!isMounted) return
        const target = buildDisplaySessionUrl(response.sid)
        window.location.replace(target)
      })
      .catch(() => {
        if (!isMounted) return
        setCreatingSession(false)
      })

    return () => {
      isMounted = false
    }
  }, [creatingSession, sessionId])

  useEffect(() => {
    if (!sessionId) return
    if (session?.sid === sessionId) return

    let isMounted = true

    void fetchPresentationSessionInfo({
      sid: sessionId,
      clientId,
      role: 'display',
    }).then((info) => {
      if (!isMounted) return
      setSnapshot(info)
    }).catch((nextError) => {
      if (!isMounted) return
      const details = nextError instanceof Error ? nextError.message : String(nextError)
      setError(`Не удалось загрузить состояние сессии: ${details}`)
    })

    return () => {
      isMounted = false
    }
  }, [clientId, session?.sid, sessionId, setError, setSnapshot])

  const handleCopy = async () => {
    if (!mobileUrl) return
    try {
      await navigator.clipboard.writeText(mobileUrl)
      setCopied(true)
      setCopyError('')
      window.setTimeout(() => setCopied(false), 1600)
    } catch (nextError) {
      setCopyError(nextError instanceof Error ? nextError.message : String(nextError))
    }
  }

  const showLoading = !sessionId || (!mobileUrl && !session && !error)

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-100">Sigma Presentation</div>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Большой экран для Ask Sigma и панелей мэра
              </h1>
              <p className="mt-4 text-lg text-blue-100">
                Отсканируйте код телефоном, откройте пульт и управляйте трансляцией. Ответы Ask Sigma и выбранные панели появятся здесь автоматически.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-blue-50">
              {sessionId && <Badge text={`Сессия ${sessionId}`} className="border-white/20 bg-white/10 text-white" />}
              {session?.controller && (
                <Badge
                  text={`Контроллер ${session.controller.clientId.slice(0, 8)}`}
                  className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                />
              )}
              <Badge
                text={connection === 'connected' ? 'Онлайн' : connection === 'error' ? 'Ошибка связи' : 'Подключение'}
                className="border-white/20 bg-white/10 text-white"
              />
              {session && (
                <Badge
                  text={`История ${session.historyDepth}`}
                  className="border-white/20 bg-white/10 text-white"
                />
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <QrCode size={26} />
              </div>
              <div>
                <div className="text-xl font-bold">Пульт на смартфоне</div>
                <div className="text-sm text-slate-500">Откройте `/mobile?s=SESSION` через QR или ссылку ниже.</div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              {showLoading ? (
                <div className="flex min-h-[280px] w-full max-w-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                  <LoaderCircle className="animate-spin" size={28} />
                </div>
              ) : mobileUrl ? (
                <SessionQrCode value={mobileUrl} />
              ) : (
                <div className="min-h-[280px] w-full max-w-[280px] rounded-2xl border border-slate-200 bg-slate-50" />
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Ссылка пульта</div>
              <div className="mt-2 break-all text-sm text-slate-900">
                {mobileUrl ?? 'Готовлю ссылку сессии…'}
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!mobileUrl}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано' : 'Скопировать ссылку'}
              </button>
              {copyError && <div className="mt-2 text-xs text-amber-700">{copyError}</div>}
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <Smartphone size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold">Состояние экрана</div>
                  <div className="text-sm text-slate-500">
                    {session?.scene.type === 'page'
                      ? 'Открыта панель мэра'
                      : session?.scene.type === 'answer'
                        ? 'Показан полноэкранный ответ Sigma'
                        : 'Ожидаю команды с телефона'}
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <div className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">Текущий режим</div>
                <div className="mt-3 text-4xl font-black text-slate-900">
                  {session?.scene.type === 'page'
                    ? session.scene.label
                    : session?.scene.type === 'answer'
                      ? session.scene.result.title
                      : 'Idle'}
                </div>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                  {session?.scene.type === 'answer'
                    ? session.scene.query
                    : session?.scene.type === 'page'
                      ? `Большой экран переведен на маршрут ${session.scene.route}.`
                      : 'Отсканируйте QR-код и отправьте первый запрос Ask Sigma или выберите панель для показа.'}
                </p>
                {session?.previousScene && (
                  <div className="mt-4 text-sm text-slate-500">
                    Предыдущая сцена: {session.previousScene.type === 'page'
                      ? session.previousScene.label
                      : session.previousScene.type === 'answer'
                        ? session.previousScene.result.title
                        : 'Idle'}
                  </div>
                )}
              </div>
            </Card>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <div className="text-lg font-bold text-red-700">Проблема со связью</div>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
