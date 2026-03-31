import { Badge, Card, MetaGrid } from '../../../components/ui'
import {
  replayPhaseLabels,
  replaySignalLabels,
} from '../presentation'
import type { IncidentReplayEvent, IncidentReplayScenario } from '../types'

export const IncidentReplayEventCard = ({
  scenario,
  event,
}: {
  scenario: IncidentReplayScenario
  event: IncidentReplayEvent
}) => {
  const recommendationTitle =
    event.phase === 'incident'
      ? 'Что нужно делать сейчас'
      : event.phase === 'before'
        ? 'Что можно было сделать'
        : 'Что делать, чтобы не допустить эскалации'

  return (
    <div data-testid="incident-replay-event-card">
      <Card>
        <div className="text-2xl font-bold leading-tight">{event.title}</div>
        <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {event.category}
        </div>

        <MetaGrid
          items={[
            { label: 'Фаза', value: replayPhaseLabels[event.phase] },
            { label: 'Ресурс', value: scenario.resourceLabel },
            { label: 'Район', value: scenario.districtLabel },
            {
              label: 'Вероятность связи',
              value: event.probability !== undefined ? `${event.probability}%` : 'сценарий без вмешательства',
            },
          ]}
          className="mt-4"
        />

        <div className="mt-4">
          <div className="text-lg font-bold">Что произошло</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
        </div>

        <div className="mt-4">
          <div className="text-lg font-bold">Ключевые сигналы</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.keySignals.map((item) => (
              <Badge key={item} text={item} className="bg-slate-100 text-slate-700" />
            ))}
            {event.visualState.signalKinds.map((signal) => (
              <Badge
                key={signal}
                text={replaySignalLabels[signal]}
                className="bg-blue-50 text-blue-700"
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-lg font-bold">{recommendationTitle}</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {event.recommendations.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {event.phase === 'after' && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Сценарий без вмешательства
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">Что будет дальше</div>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {(event.consequences ?? []).map((item) => (
                <li key={item} className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}
