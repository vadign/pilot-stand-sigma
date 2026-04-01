import { ChevronLeft, ChevronRight, LoaderCircle, Mic, MicOff, SendHorizontal, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useIncidentViews } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'
import type { AskSigmaAction } from '../ask-sigma/types'
import { quickExamplesByRole } from '../ask-sigma/suggestedQuestions'
import { ResultRenderer } from '../ask-sigma/rendering/resultRenderers/ResultRenderer'
import { useAskSigmaStore } from '../ask-sigma/store'
import { runAskSigmaQuery } from '../ask-sigma/runner'
import { LocalAskSigmaProvider } from '../ask-sigma/provider'
import { useVoiceInput } from '../ask-sigma/voice/useVoiceInput'
import { fetchPresentationSessionInfo, postPresentationCommand, PresentationControllerConflictError } from './api'
import { buildOpenPageCommandFromRoute, getDefaultPresentationState } from './adapters'
import { resolvePresentationRoute } from './actionCommands'
import { getPresentationClientId } from './clientId'
import { presentationPresets } from './presets'
import { getPresentationSessionId } from './url'
import type {
  PresentationAnswerScene,
  BriefingPresentationState,
  HistoryPresentationState,
  MayorDashboardPresentationState,
  PresentationCommand,
  PresentationPageState,
  PresentationSessionInfo,
} from './types'
import { transportDistrictOptions } from '../pages/shared'
import {
  subsystemTabs,
} from '../pages/shared'

type PendingConflict = {
  command: PresentationCommand
}

const pageShortcuts = [
  { label: 'Панель мэра', route: '/mayor-dashboard' },
  { label: 'Брифинг', route: '/briefing' },
  { label: 'История', route: '/history' },
] as const

const transportFocusShortcuts = [
  { label: 'Карта', focus: 'map' as const },
  { label: 'Маршрут', focus: 'list' as const },
  { label: 'Хабы', focus: 'hubs' as const },
  { label: 'Тарифы', focus: 'fares' as const },
  { label: 'Связность', focus: 'connectivity' as const },
] as const

const triggerHaptic = () => {
  window.navigator.vibrate?.(20)
}

const buttonClassName = (active = false) =>
  active
    ? 'rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-left text-sm font-semibold text-white transition'
    : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50'

const getAnswerScene = (sessionInfo?: PresentationSessionInfo): PresentationAnswerScene | undefined => {
  if (sessionInfo?.scene.type === 'answer') return sessionInfo.scene
  if (sessionInfo?.previousScene?.type === 'answer') return sessionInfo.previousScene
  return undefined
}

const getControlState = (sessionInfo?: PresentationSessionInfo): PresentationPageState => {
  if (sessionInfo?.scene.type === 'page') return sessionInfo.scene.state
  if (sessionInfo?.previousScene?.type === 'page') return sessionInfo.previousScene.state
  return getDefaultPresentationState('mayor-dashboard')
}

const isOperationsAction = (action: AskSigmaAction): boolean => {
  if (action.presentationCommand?.type === 'OPEN_PAGE' && action.presentationCommand.page.pageKey === 'operations') {
    return true
  }

  if (action.presentationCommand?.type === 'PATCH_PAGE_STATE' && action.presentationCommand.pageKey === 'operations') {
    return true
  }

  const route = resolvePresentationRoute(action)
  return Boolean(route?.startsWith('/operations'))
}

export default function PresentationMobilePage() {
  const [searchParams] = useSearchParams()
  const sessionId = useMemo(() => getPresentationSessionId(searchParams), [searchParams])
  const isViewerMode = searchParams.get('viewer') === '1' || searchParams.get('mode') === 'viewer'
  const [input, setInput] = useState('')
  const [sessionInfo, setSessionInfo] = useState<PresentationSessionInfo>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null)
  const [presetIndex, setPresetIndex] = useState(0)
  const role = useAskSigmaStore((state) => state.role)
  const district = useAskSigmaStore((state) => state.district)
  const setRole = useAskSigmaStore((state) => state.setRole)
  const voiceState = useAskSigmaStore((state) => state.voiceState)
  const districts = useSigmaStore((state) => state.districts)
  const incidents = useIncidentViews()
  const clientId = useMemo(() => getPresentationClientId(isViewerMode ? 'viewer' : 'mobile'), [isViewerMode])
  const provider = useMemo(() => new LocalAskSigmaProvider(), [])
  const currentAnswer = getAnswerScene(sessionInfo)
  const controlState = getControlState(sessionInfo)
  const mayorControlState: MayorDashboardPresentationState = controlState.pageKey === 'mayor-dashboard'
    ? controlState
    : getDefaultPresentationState('mayor-dashboard') as MayorDashboardPresentationState
  const briefingControlState: BriefingPresentationState = controlState.pageKey === 'briefing'
    ? controlState
    : getDefaultPresentationState('briefing') as BriefingPresentationState
  const historyControlState: HistoryPresentationState = controlState.pageKey === 'history'
    ? controlState
    : getDefaultPresentationState('history') as HistoryPresentationState
  const isController = !sessionInfo?.controller || sessionInfo.controller.clientId === clientId
  const controlsDisabled = loading || isViewerMode
  const preset = presentationPresets[presetIndex] ?? presentationPresets[0]
  const visibleAnswerActions = currentAnswer?.actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => !isOperationsAction(action)) ?? []
  const visibleAnswerResult = currentAnswer
    ? { ...currentAnswer.result, actions: visibleAnswerActions.map(({ action }) => action) }
    : undefined

  const refreshSessionInfo = async () => {
    if (!sessionId) return
    const info = await fetchPresentationSessionInfo({
      sid: sessionId,
      clientId,
      role: isViewerMode ? 'viewer' : 'mobile',
    })
    setSessionInfo(info)
  }

  useEffect(() => {
    if (!sessionId) return
    void refreshSessionInfo().catch((nextError) => {
      const details = nextError instanceof Error ? nextError.message : String(nextError)
      setError(`Не удалось получить состояние сессии: ${details}`)
    })
  }, [clientId, isViewerMode, sessionId])

  useEffect(() => {
    if (!sessionId || typeof EventSource === 'undefined') return

    const stream = new EventSource(`/session/${sessionId}/stream`)
    stream.addEventListener('snapshot', (event) => {
      setSessionInfo(JSON.parse(event.data) as PresentationSessionInfo)
    })
    stream.onerror = () => {
      setError((current) => current || 'SSE-соединение переподключается')
    }

    return () => {
      stream.close()
    }
  }, [sessionId])

  const sendCommand = async (command: PresentationCommand, takeover = false) => {
    if (!sessionId || isViewerMode) return

    triggerHaptic()
    setLoading(true)
    setError('')

    try {
      const info = await postPresentationCommand(sessionId, { clientId, command, takeover })
      setSessionInfo(info)
      setPendingConflict(null)
    } catch (nextError) {
      if (nextError instanceof PresentationControllerConflictError) {
        setPendingConflict({ command })
        setError('Эта сессия уже управляется с другого телефона.')
        await refreshSessionInfo()
      } else {
        const details = nextError instanceof Error ? nextError.message : String(nextError)
        setError(`Не удалось отправить команду: ${details}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const submitAsk = async (rawQuery: string, takeover = false) => {
    const query = rawQuery.trim()
    if (!query) return

    const execution = runAskSigmaQuery({
      query,
      provider,
      role,
      implicitDistrict: district,
    })

    if (execution.roleChange) {
      setRole(execution.roleChange.role, execution.roleChange.district)
    }

    await sendCommand({
      type: 'SHOW_ANSWER',
      query,
      result: execution.result,
      actions: execution.result.actions ?? [],
    }, takeover)
    setInput(query)
  }

  const { supported, start, stop } = useVoiceInput({
    onTranscript: (query) => {
      void submitAsk(query)
    },
  })

  const handleTakeover = async () => {
    if (!pendingConflict) return
    await sendCommand(pendingConflict.command, true)
  }

  const presentRoute = async (route: string, label?: string) => {
    await sendCommand(buildOpenPageCommandFromRoute(route, label))
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-xl space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Smartphone size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">
                {isViewerMode ? 'Sigma Viewer' : 'Sigma Mobile'}
              </div>
              <div className="text-2xl font-black">
                {isViewerMode ? 'Наблюдение за трансляцией' : 'Пульт презентации'}
              </div>
              <div className="truncate text-sm text-slate-500">Сессия: {sessionId ?? 'не указана'}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <div className={`rounded-full px-3 py-1 ${isViewerMode ? 'bg-slate-200 text-slate-700' : isController ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isViewerMode ? 'Режим наблюдателя' : isController ? 'Вы управляете сессией' : 'Контроль у другого телефона'}
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Роль: {role}</div>
            {sessionInfo?.scene.type === 'page' && (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Экран: {sessionInfo.scene.label}</div>
            )}
            {sessionInfo?.scene.type === 'answer' && (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Экран: Ask Sigma</div>
            )}
          </div>

          {!isViewerMode && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!sessionInfo?.previousScene || controlsDisabled}
                onClick={() => void sendCommand({ type: 'RESTORE_PREVIOUS_SCENE' })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => void sendCommand({ type: 'CLEAR_TO_IDLE' })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить экран
              </button>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Сценарии</div>
              <div className="mt-1 text-xl font-bold">{preset?.label ?? 'Нет пресетов'}</div>
              {preset?.note && <div className="mt-1 text-sm text-slate-500">{preset.note}</div>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={presentationPresets.length < 2}
                onClick={() => setPresetIndex((index) => (index - 1 + presentationPresets.length) % presentationPresets.length)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 disabled:opacity-60"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                disabled={presentationPresets.length < 2}
                onClick={() => setPresetIndex((index) => (index + 1) % presentationPresets.length)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 disabled:opacity-60"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={!preset || controlsDisabled}
            onClick={() => preset && void sendCommand({ type: 'APPLY_PRESET', presetId: preset.id })}
            className="mt-4 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Применить пресет
          </button>
        </Card>

        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Ask Sigma</div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Спросите Сигму"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitAsk(input)
              }}
            />
            <button
              type="button"
              disabled={!input.trim() || controlsDisabled}
              onClick={() => void submitAsk(input)}
              className="rounded-2xl bg-blue-600 px-4 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizontal size={18} />
            </button>
            <button
              type="button"
              disabled={!supported || controlsDisabled}
              onClick={() => (voiceState === 'listening' ? stop() : start())}
              className="rounded-2xl border border-slate-300 bg-white px-4 text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              title={supported ? 'Голосовой ввод' : 'Не поддерживается'}
            >
              {voiceState === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {voiceState === 'listening' && 'Слушаю…'}
            {voiceState === 'processing' && 'Обрабатываю…'}
            {voiceState === 'error' && 'Ошибка голосового ввода'}
            {voiceState === 'unsupported' && 'Голосовой ввод не поддерживается в этом браузере'}
            {isViewerMode && 'Наблюдатель не может отправлять команды.'}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(quickExamplesByRole[role] ?? quickExamplesByRole.мэр).map((question) => (
              <button
                key={question}
                type="button"
                disabled={controlsDisabled}
                onClick={() => void submitAsk(question)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {question}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Быстрые панели</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pageShortcuts.map((shortcut) => (
              <button
                key={shortcut.route}
                type="button"
                disabled={controlsDisabled}
                onClick={() => void presentRoute(shortcut.route, shortcut.label)}
                className={`${buttonClassName(false)} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </Card>

        {controlState.pageKey === 'mayor-dashboard' && (
          <Card>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Панель мэра</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {subsystemTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={mayorControlState.subsystem === tab.id}
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'PATCH_PAGE_STATE',
                    pageKey: 'mayor-dashboard',
                    patch: {
                      subsystem: tab.id,
                      ...(tab.id === 'transport' ? { mode: 'minibus', route: '35' } : {}),
                    },
                    label: `Панель мэра · ${tab.title}`,
                  })}
                  className={`${buttonClassName(mayorControlState.subsystem === tab.id)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                value={mayorControlState.district}
                onChange={(event) => void sendCommand({
                  type: 'PATCH_PAGE_STATE',
                  pageKey: 'mayor-dashboard',
                  patch: { district: event.target.value },
                })}
                disabled={controlsDisabled}
              >
                <option value="">Все районы</option>
                {(mayorControlState.subsystem === 'transport' ? transportDistrictOptions : districts.map((item) => item.id)).map((value) => (
                  <option key={value} value={value}>
                    {mayorControlState.subsystem === 'transport'
                      ? value
                      : districts.find((item) => item.id === value)?.name ?? value}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                {(['map', 'list'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={mayorControlState.view === view}
                    disabled={controlsDisabled}
                    onClick={() => void sendCommand({
                      type: 'PATCH_PAGE_STATE',
                      pageKey: 'mayor-dashboard',
                      patch: { view },
                    })}
                    className={`${buttonClassName(mayorControlState.view === view)} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {view === 'map' ? 'Карта' : 'Список'}
                  </button>
                ))}
              </div>
            </div>

            {mayorControlState.subsystem === 'transport' && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {transportFocusShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.focus}
                    type="button"
                    aria-pressed={mayorControlState.focus === shortcut.focus}
                    disabled={controlsDisabled}
                    onClick={() => void sendCommand({
                      type: 'PATCH_PAGE_STATE',
                      pageKey: 'mayor-dashboard',
                      patch: { subsystem: 'transport', focus: shortcut.focus, mode: 'minibus', route: mayorControlState.route || '35' },
                      label: `Панель мэра · Транспорт · ${shortcut.label}`,
                    })}
                    className={`${buttonClassName(mayorControlState.focus === shortcut.focus)} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {controlState.pageKey === 'briefing' && (
          <Card>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Брифинг</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['summary', 'Сводка'],
                ['incidents', 'Инциденты'],
                ['districts', 'Районы'],
              ].map(([focus, label]) => (
                <button
                  key={focus}
                  type="button"
                  aria-pressed={briefingControlState.focus === focus}
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'PATCH_PAGE_STATE',
                    pageKey: 'briefing',
                    patch: { focus: focus as typeof controlState.focus },
                  })}
                  className={`${buttonClassName(briefingControlState.focus === focus)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              {incidents.filter((incident) => incident.sourceKind === 'live').slice(0, 5).map((incident) => (
                <button
                  key={incident.id}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'PATCH_PAGE_STATE',
                    pageKey: 'briefing',
                    patch: { focus: 'incidents', incident: incident.id },
                  })}
                  className={`${buttonClassName(briefingControlState.incident === incident.id)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {incident.title}
                </button>
              ))}
            </div>
          </Card>
        )}

        {controlState.pageKey === 'history' && (
          <Card>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">История</div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                ['7d', '7 дней'],
                ['1m', 'месяц'],
                ['1q', 'квартал'],
                ['1y', 'год'],
              ].map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={historyControlState.period === period}
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'PATCH_PAGE_STATE',
                    pageKey: 'history',
                    patch: { period: period as typeof controlState.period },
                  })}
                  className={`${buttonClassName(historyControlState.period === period)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ['trend', 'Тренд'],
                ['map', 'Карта'],
                ['categories', 'Категории'],
                ['districts', 'Районы'],
              ].map(([focus, label]) => (
                <button
                  key={focus}
                  type="button"
                  aria-pressed={historyControlState.focus === focus}
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'PATCH_PAGE_STATE',
                    pageKey: 'history',
                    patch: { focus: focus as typeof controlState.focus },
                  })}
                  className={`${buttonClassName(historyControlState.focus === focus)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>
        )}

        {pendingConflict && (
          <Card className="border-amber-200 bg-amber-50">
            <div className="text-lg font-bold text-amber-700">Сессия занята</div>
            <div className="mt-2 text-sm text-amber-700">
              Сейчас управляет устройство {sessionInfo?.controller?.clientId.slice(0, 8) ?? '—'}.
            </div>
            <button
              type="button"
              onClick={() => void handleTakeover()}
              className="mt-4 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Перехватить управление
            </button>
          </Card>
        )}

        {error && !pendingConflict && (
          <Card className="border-red-200 bg-red-50">
            <div className="text-sm text-red-700">{error}</div>
          </Card>
        )}

        {loading && (
          <div className="flex items-center justify-center py-2 text-sm text-slate-500">
            <LoaderCircle className="mr-2 animate-spin" size={18} />
            Отправляю команду…
          </div>
        )}

        {currentAnswer && (
          <>
            <Card>
              <div className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Действия по ответу</div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => void sendCommand({
                    type: 'SHOW_ANSWER',
                    query: currentAnswer.query,
                    result: currentAnswer.result,
                    actions: currentAnswer.actions,
                  })}
                  className={`${buttonClassName(false)} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Показать ответ
                </button>
                {visibleAnswerActions[0] && (
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => void sendCommand({ type: 'RUN_ACTION', actionIndex: visibleAnswerActions[0].index })}
                    className={`${buttonClassName(false)} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Открыть связанный экран
                  </button>
                )}
                {visibleAnswerActions[1] && (
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => void sendCommand({ type: 'RUN_ACTION', actionIndex: visibleAnswerActions[1].index })}
                    className={`${buttonClassName(false)} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Запустить следующий шаг
                  </button>
                )}
              </div>
            </Card>

            <div className="rounded-3xl border border-slate-200 bg-white p-1 text-slate-900 shadow-sm">
              <ResultRenderer
                result={visibleAnswerResult ?? currentAnswer.result}
                onAction={(action) => {
                  if (isOperationsAction(action)) return
                  if (action.presentationCommand) {
                    void sendCommand(action.presentationCommand)
                    return
                  }
                  const route = resolvePresentationRoute(action)
                  if (!route) return
                  void presentRoute(route, action.label)
                }}
                onHintSelect={(question) => {
                  void submitAsk(question)
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
