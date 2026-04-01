import { Badge } from '../../components/ui'
import { ResultRenderer } from '../ask-sigma/rendering/resultRenderers/ResultRenderer'
import { usePresentationStore } from './store'

export const PresentationAnswerView = () => {
  const session = usePresentationStore((state) => state.session)

  if (session?.scene.type !== 'answer') return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] bg-slate-200/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center px-6 py-10">
        <div className="pointer-events-auto w-full rounded-[32px] border border-slate-200 bg-slate-100 p-8 shadow-2xl">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">Ask Sigma</div>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Ответ на большом экране</h2>
              <p className="mt-3 max-w-3xl text-lg text-slate-600">
                Запрос: <span className="font-semibold text-slate-900">{session.scene.query}</span>
              </p>
            </div>
            <div className="space-y-2 text-right text-sm text-slate-500">
              <Badge text={`Сессия ${session.sid}`} className="border-slate-200 bg-white text-slate-700" />
              {session.controller && (
                <div>Управляет: {session.controller.clientId.slice(0, 8)}</div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900">
            {(session.scene.actions?.length ?? 0) > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {session.scene.actions?.map((action) => (
                  <Badge
                    key={`${action.label}-${action.route ?? 'no-route'}`}
                    text={action.label}
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  />
                ))}
              </div>
            )}
            <ResultRenderer
              result={session.scene.result}
              onAction={() => undefined}
              disableActions
            />
          </div>
        </div>
      </div>
    </div>
  )
}
