import type { IncidentReplayEvent, IncidentReplayScenario } from '../types'
import { replayPipeColors, replaySignalColors } from '../presentation'

const objectFillByKind = {
  apartment: '#e2e8f0',
  kindergarten: '#ffedd5',
  administrative: '#dbeafe',
} as const

const objectStrokeByKind = {
  apartment: '#64748b',
  kindergarten: '#f97316',
  administrative: '#2563eb',
} as const

export const IncidentReplayDiagram = ({
  scenario,
  event,
}: {
  scenario: IncidentReplayScenario
  event: IncidentReplayEvent
}) => {
  return (
    <div data-testid="incident-replay-diagram" className="space-y-2">
      <div className="relative h-[248px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:h-[260px] lg:h-[244px] xl:h-[248px]">
        <svg
          viewBox="0 0 900 420"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="incident-replay-pipe" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor={replayPipeColors[event.visualState.pipeSeverity]} />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="900" height="420" fill="#f8fafc" />

          {event.visualState.impactRadius > 0 && (
            <circle
              cx="470"
              cy="192"
              r={event.visualState.impactRadius}
              fill="#fecaca"
              stroke="#fca5a5"
              strokeWidth="3"
              opacity={event.visualState.impactOpacity}
            />
          )}

          <path
            d="M90 220 C 210 220, 250 190, 340 190 L 560 190 C 650 190, 690 220, 810 220"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M90 220 C 210 220, 250 190, 340 190 L 560 190 C 650 190, 690 220, 810 220"
            fill="none"
            stroke="url(#incident-replay-pipe)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {scenario.affectedObjects.map((item) => {
            const isHighlighted = event.visualState.highlightedObjectIds.includes(item.id)

            return (
              <g key={item.id} opacity={isHighlighted ? 1 : 0.58}>
                <rect
                  x={item.x}
                  y={item.y}
                  width={item.kind === 'administrative' ? 94 : 82}
                  height={item.kind === 'kindergarten' ? 72 : 64}
                  rx="14"
                  fill={isHighlighted ? '#ffffff' : objectFillByKind[item.kind]}
                  stroke={objectStrokeByKind[item.kind]}
                  strokeWidth={isHighlighted ? 4 : 2}
                />
                <text
                  x={item.x + (item.kind === 'administrative' ? 47 : 41)}
                  y={item.y + 32}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {item.shortLabel}
                </text>
                <text
                  x={item.x + (item.kind === 'administrative' ? 47 : 41)}
                  y={item.y + 88}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                >
                  {item.label}
                </text>
              </g>
            )
          })}

          {event.visualState.signalKinds.map((signalKind, index) => (
            <g key={`${signalKind}-${index}`}>
              <circle
                cx={240 + index * 90}
                cy={116 - (index % 2) * 24}
                r="10"
                fill={replaySignalColors[signalKind]}
              />
              <line
                x1={240 + index * 90}
                y1={126 - (index % 2) * 24}
                x2={240 + index * 90}
                y2="180"
                stroke={replaySignalColors[signalKind]}
                strokeDasharray="5 5"
                strokeWidth="2"
              />
            </g>
          ))}

          <circle
            cx="470"
            cy="192"
            r={event.visualState.showRupture ? 18 : 10}
            fill={event.visualState.showRupture ? '#dc2626' : '#fb7185'}
            stroke="#fff"
            strokeWidth="5"
          />
          {event.visualState.showRupture && (
            <>
              <line x1="454" y1="176" x2="486" y2="208" stroke="#fff" strokeWidth="4" />
              <line x1="486" y1="176" x2="454" y2="208" stroke="#fff" strokeWidth="4" />
            </>
          )}
        </svg>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <div className="font-semibold text-slate-900">{scenario.networkLabel}</div>
        <div className="mt-0.5">
          {scenario.pipeTypeLabel} · {scenario.seasonLabel} · {scenario.loadLabel}
        </div>
        <div
          className="mt-1 text-slate-500"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.visualState.zoneLabel}
        </div>
      </div>
    </div>
  )
}
