import { useNavigate } from 'react-router-dom'
import { Badge, Card, SectionTitle, SourceMetaFooter } from '../../components/ui'
import { formatSourceOriginLabel } from '../../lib/sourcePresentation'
import { useSigmaStore } from '../../store/useSigmaStore'
import { buildExecutiveReportModel } from '../reports/buildExecutiveReport'
import { severityStyles, useDashboardData } from './shared'

const toneClassName: Record<'critical' | 'warning' | 'neutral', string> = {
  critical: 'text-red-600',
  warning: 'text-amber-600',
  neutral: 'text-slate-900',
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const sourceMode = useSigmaStore((state) => state.live.mode)
  const { incidents, outageSummary, sourceStatuses, live } = useDashboardData()
  const sourceStatus = sourceStatuses.find((item) => item.key === '051')

  if (!outageSummary || !sourceStatus) {
    return (
      <Card>
        <SectionTitle
          title="Ежедневная сводка руководителя"
          subtitle="Сводка станет доступна, когда в live-контуре 051 появятся пригодные данные."
        />
      </Card>
    )
  }

  const report = buildExecutiveReportModel({
    summary: outageSummary,
    currentSnapshot: live.outages?.payload.snapshot,
    history: live.liveHistory,
    incidents,
    sourceStatus,
    sourceMode,
  })

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title={report.title} subtitle={report.subtitle} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge text={`Источник: ${report.sourceLabel}`} />
          <Badge text={`Режим: ${report.sourceModeLabel}`} />
          <Badge text={`Статус: ${report.sourceStatusLabel}`} />
          <Badge text={`Контур: ${formatSourceOriginLabel(sourceStatus.source)}`} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-2xl font-bold">Executive summary</div>
        <div className="space-y-2 text-base leading-relaxed text-slate-700 lg:text-lg">
          {report.summaryLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.kpis.map((item) => (
          <Card key={item.id}>
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className={`mt-2 text-4xl font-bold ${toneClassName[item.tone ?? 'neutral']}`}>
              {item.value}
            </div>
            <div className="mt-2 text-sm text-slate-500">{item.caption}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">Что изменилось со вчера</div>
            {report.comparisonUnavailableReason && (
              <div className="mt-1 text-sm text-slate-500">{report.comparisonUnavailableReason}</div>
            )}
          </div>
          <button
            type="button"
            data-testid="reports-open-history"
            onClick={() => navigate('/history')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            Открыть историю
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {report.deltaCards.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-3xl font-bold text-blue-700">{item.value}</div>
              <div className="mt-2 text-sm text-slate-500">{item.caption}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="mb-3 text-2xl font-bold">Точки внимания по районам</div>
          <div className="space-y-2">
            {report.topDistricts.slice(0, 5).map((district) => (
              <button
                key={district.district}
                type="button"
                data-testid="reports-top-district"
                onClick={() => navigate(`/operations?district=${encodeURIComponent(district.district)}`)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{district.district}</span>
                  <span className="text-sm text-slate-500">{district.incidents} событий</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">Отключённых домов: {district.houses}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <div className="mb-3 text-2xl font-bold">Приоритетные инциденты</div>
          <div className="space-y-2">
            {report.priorityIncidents.map((incident) => (
              <button
                key={incident.id}
                type="button"
                data-testid="reports-priority-incident"
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{incident.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{incident.summary}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}>
                  {incident.severity}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <SourceMetaFooter
        source={report.sourceLabel}
        updatedAt={report.updatedAt}
        ttl={`${sourceStatus.ttlMinutes} мин`}
        type={sourceStatus.type}
        status={sourceStatus.status}
      />
    </div>
  )
}
