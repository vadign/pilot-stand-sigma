import { Card } from '../../../../components/ui'
import { getDistrictAnswerName } from '../../../../lib/districts'
import { buildIncidentReplayRoute, canOpenIncidentReplay, incidentReplayCtaLabel } from '../../../incident-replay/availability'
import { getTransportDistrictLabel } from '../../../public-transport/selectors'
import type { AskSigmaAction, AskSigmaResult } from '../../types'

export const ResultRenderer = ({
  result,
  onAction,
  onHintSelect,
  disableActions = false,
}: {
  result: AskSigmaResult
  onAction: (action: AskSigmaAction) => void
  onHintSelect?: (question: string) => void
  disableActions?: boolean
}) => {
  const isUnknown = result.type === 'UNKNOWN'
  const canRunHintQuery = Boolean(onHintSelect) && (isUnknown || result.type === 'HELP')
  const hints = result.hints?.map((hint) => typeof hint === 'string' ? { question: hint } : hint)
  const hintsTitle = isUnknown
    ? 'Сейчас Сигма уже понимает такие запросы:'
    : result.type === 'HELP'
      ? 'Поддерживаемые запросы:'
      : 'Похожие запросы:'

  return (
    <Card>
      <h3 className="text-xl font-bold">{result.title}</h3>
      {result.summary && <p className="mt-2 text-sm text-slate-600">{result.summary}</p>}

      {isUnknown && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Эта тема пока не входит в поддерживаемые сценарии. Попробуйте один из запросов ниже.
        </div>
      )}


      {result.appliedDistrictFilter && (
        <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-950">
          Применен {result.appliedDistrictFilter.source === 'implicit' ? 'неявный' : 'явный'} фильтр района: <b>{result.appliedDistrictFilter.district}</b>
        </div>
      )}

      {result.kpis && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {result.kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border p-2 text-sm"><div className="text-slate-500">{kpi.label}</div><div className="font-semibold">{kpi.value}</div></div>
          ))}
        </div>
      )}

      {result.incidents && (
        <div className="mt-3 space-y-2">
          {result.incidents.map((incident) => (
            <div key={incident.id} className="rounded-lg border p-2 text-sm">
              <div className="font-semibold">{incident.title}</div>
              <div>{incident.severity} · {incident.status} · {getDistrictAnswerName(incident.district)}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {disableActions ? (
                  <span className="inline-flex rounded border px-2 py-1 text-xs font-semibold text-slate-700">
                    Открыть карточку
                  </span>
                ) : (
                  <button
                    className="rounded border px-2 py-1"
                    onClick={() => onAction({ label: 'Открыть', route: `/incidents/${incident.id}`, district: incident.district })}
                  >
                    Открыть
                  </button>
                )}
                {canOpenIncidentReplay(incident) && (
                  disableActions ? (
                    <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {incidentReplayCtaLabel}
                    </span>
                  ) : (
                    <button
                      className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700"
                      onClick={() => onAction({
                        label: incidentReplayCtaLabel,
                        incidentId: incident.id,
                        route: buildIncidentReplayRoute(incident.id),
                        district: incident.district,
                      })}
                    >
                      {incidentReplayCtaLabel}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.transportStops && (
        <div className="mt-3 space-y-2 text-sm">
          {result.transportStops.map((stop) => (
            <div key={stop.id} className="rounded border p-2">
              <div className="font-semibold">{stop.name}</div>
              <div>{getTransportDistrictLabel(stop.district)} · {stop.street || 'адрес не указан'}</div>
              <div className="text-slate-500">Маршруты: {stop.routesParsed.map((route) => route.number).join(', ') || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {result.transportRoute && (
        <div className="mt-3 rounded border p-2 text-sm">
          <div className="font-semibold">Маршрут {result.transportRoute.route}</div>
          <div>Остановок: {result.transportRoute.stopCount}</div>
          <div>Районы: {result.transportRoute.districts.join(', ')}</div>
        </div>
      )}

      {result.districtCompare && (
        <div className="mt-3 rounded border p-2 text-sm">
          <div className="font-semibold">{result.districtCompare.from} → {result.districtCompare.to}</div>
          <div>Общих маршрутов: {result.districtCompare.count}</div>
          <div>Номера: {result.districtCompare.commonRoutes.join(', ') || 'нет'}</div>
        </div>
      )}


      {result.transportRouteBetweenDistricts && (
        <div className="mt-3 rounded border p-2 text-sm">
          <div className="font-semibold">{result.transportRouteBetweenDistricts.from} → {result.transportRouteBetweenDistricts.to}</div>
          <div>Общих маршрутов: {result.transportRouteBetweenDistricts.count}</div>
          <div>Маршруты: {result.transportRouteBetweenDistricts.commonRoutes.join(', ') || 'нет'}</div>
          <div className="mt-1 text-slate-600">A: {result.transportRouteBetweenDistricts.examplesFrom.join(', ') || '—'}</div>
          <div className="text-slate-600">B: {result.transportRouteBetweenDistricts.examplesTo.join(', ') || '—'}</div>
          <div className="mt-1 text-xs text-slate-500">{result.transportRouteBetweenDistricts.note}</div>
        </div>
      )}

      {result.transportFares && (
        <div className="mt-3 space-y-2 text-sm">
          {result.transportFares.map((fare) => (
            <div key={fare.id} className="rounded border p-2">
              <div className="font-semibold">{fare.fareType}</div>
              <div>{fare.amount} ₽ · {fare.mode}</div>
            </div>
          ))}
        </div>
      )}

      {result.approvals && (
        <ul className="mt-3 space-y-2 text-sm">
          {result.approvals.map((item) => <li key={item.id} className="rounded border p-2">{item.id}: {item.reason} · {item.initiator}</li>)}
        </ul>
      )}
      {result.sourceStatuses && (
        <div className="mt-3 space-y-2 text-sm">
          {result.sourceStatuses.map((status) => (
            <div key={status.key} className="rounded border p-2">
              <div className="font-semibold">{status.title}</div>
              <div>{status.source}/{status.status} · {status.type}</div>
              <div className="text-slate-500">Обновлено: {status.updatedAt ? new Date(status.updatedAt).toLocaleString('ru-RU') : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {result.regulations && (
        <ul className="mt-3 space-y-2 text-sm">
          {result.regulations.map((regulation) => <li key={regulation.id} className="rounded border p-2">{regulation.code} · {regulation.title}</li>)}
        </ul>
      )}

      {result.deputy && <div className="mt-3 rounded border p-2 text-sm">{result.deputy.name} · режим {result.deputy.mode}</div>}

      {result.compare && (
        <div className="mt-3 rounded border p-2 text-sm">
          <div>{result.compare.baseline} ↔ {result.compare.intervention}</div>
          <ul>{result.compare.effects.map((effect) => <li key={effect}>• {effect}</li>)}</ul>
        </div>
      )}

      {hints && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-900">{hintsTitle}</p>
          <div className="mt-3 space-y-2">
            {hints.map((hint) => (
              canRunHintQuery ? (
                <button
                  key={hint.question}
                  type="button"
                  onClick={() => onHintSelect?.(hint.question)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="text-sm font-semibold text-slate-900">{hint.question}</div>
                  {hint.description && <div className="mt-1 text-sm text-slate-600">{hint.description}</div>}
                </button>
              ) : (
                <div key={hint.question} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">{hint.question}</div>
                  {hint.description && <div className="mt-1 text-sm text-slate-600">{hint.description}</div>}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {result.actions?.map((action) => (
          disableActions || !action.route ? (
            <span
              key={action.label + (action.route ?? '')}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              {action.label}
            </span>
          ) : (
            <button
              key={action.label + action.route}
              onClick={() => onAction(action)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              {action.label}
            </button>
          )
        ))}
      </div>
    </Card>
  )
}
