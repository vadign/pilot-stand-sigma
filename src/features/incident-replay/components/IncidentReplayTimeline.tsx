import { Badge } from '../../../components/ui'
import {
  replayPhaseBadgeStyles,
  replayPhaseLabels,
  replayStatusBadgeStyles,
} from '../presentation'
import type { IncidentReplayEvent } from '../types'

const phaseWidth = (count: number, total: number): string => `${(count / total) * 100}%`

export const IncidentReplayTimeline = ({
  events,
  activeIndex,
  onChange,
}: {
  events: IncidentReplayEvent[]
  activeIndex: number
  onChange: (nextIndex: number) => void
}) => {
  const beforeCount = events.filter((event) => event.phase === 'before').length
  const incidentCount = events.filter((event) => event.phase === 'incident').length
  const afterCount = events.filter((event) => event.phase === 'after').length
  const activeEvent = events[activeIndex]

  return (
    <div className="space-y-3" data-testid="incident-replay-timeline">
      <div
        data-testid="incident-replay-active-summary"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">{activeEvent.relativeTimeLabel}</span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-sm text-slate-700">{activeEvent.title}</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">{activeEvent.category}</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge text={replayPhaseLabels.before} className={replayPhaseBadgeStyles.before} />
        <Badge text={replayPhaseLabels.incident} className={replayPhaseBadgeStyles.incident} />
        <Badge text={replayPhaseLabels.after} className={replayPhaseBadgeStyles.after} />
      </div>

      <div className="overflow-hidden rounded-full border border-slate-200">
        <div className="flex h-1.5 w-full">
          <div className="bg-amber-400" style={{ width: phaseWidth(beforeCount, events.length) }} />
          <div className="bg-red-500" style={{ width: phaseWidth(incidentCount, events.length) }} />
          <div className="bg-cyan-500" style={{ width: phaseWidth(afterCount, events.length) }} />
        </div>
      </div>

      <input
        data-testid="incident-replay-range"
        type="range"
        min={0}
        max={events.length - 1}
        step={1}
        value={activeIndex}
        onInput={(event) => onChange(Number((event.target as HTMLInputElement).value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-blue-600"
      />

      <div className="flex flex-wrap gap-1.5">
        {events.map((event, index) => {
          const isActive = index === activeIndex

          return (
            <button
              key={`legend-${event.id}`}
              type="button"
              data-testid={`incident-replay-jump-${event.id}`}
              aria-pressed={isActive}
              onClick={() => onChange(index)}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                isActive
                  ? `${replayStatusBadgeStyles[event.status]} ring-2 ring-offset-1 ring-slate-300`
                  : `${replayStatusBadgeStyles[event.status]} hover:opacity-85`
              }`}
            >
              {event.relativeTimeLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
