import { Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, SourceMetaFooter } from '../../components/ui'
import { getOutageKindLabel } from '../../live/outageKindLabels'
import { formatDelta, sourceTypeLabels, useDashboardData } from './shared'

export default function BriefingPage() {
  const navigate = useNavigate()
  const { incidents, outageSummary, districtCards, sourceStatuses } = useDashboardData()
  const liveStatus051 = sourceStatuses.find((item) => item.key === '051')
  const emergencyLive = incidents.filter(
    (incident) => incident.sourceKind === 'live' && incident.liveMeta?.outageKind === 'emergency',
  )
  const plannedLive = incidents.filter(
    (incident) => incident.sourceKind === 'live' && incident.liveMeta?.outageKind === 'planned',
  )

  const formatSourceLabel = (sourceUrl?: string, fallback?: string) => {
    if (!sourceUrl) return fallback ?? '—'

    try {
      return new URL(sourceUrl).host
    } catch {
      return fallback ?? sourceUrl
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
              Sigma Управленческий отчет
            </div>
            <h1 className="text-4xl font-extrabold">
              Ежедневный управленческий отчет: {new Date().toLocaleDateString('ru-RU')}
            </h1>
            <p className="mt-2 text-lg text-slate-500">
              Реальные отключения ЖКХ из 051 и оперативная сводка по городским событиям.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl border px-3 py-2 font-semibold"
          >
            <Download size={14} className="mr-1 inline" />
            Экспорт PDF
          </button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">
            {getOutageKindLabel('emergency', 'titlePlural')} отключения 051
          </div>
          <div className="mt-2 text-5xl font-bold text-red-600">{emergencyLive.length}</div>
          <div className="text-slate-500">домов: {outageSummary?.emergencyHouses ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">
            {getOutageKindLabel('planned', 'titlePlural')} отключения 051
          </div>
          <div className="mt-2 text-5xl font-bold text-amber-600">{plannedLive.length}</div>
          <div className="text-slate-500">домов: {outageSummary?.plannedHouses ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Δ к предыдущему snapshot</div>
          <div className="mt-2 text-5xl font-bold text-blue-700">
            {formatDelta(outageSummary?.delta?.incidents)}
          </div>
          <div className="text-slate-500">по активным событиям</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Районов с нагрузкой</div>
          <div className="mt-2 text-5xl font-bold text-emerald-600">{districtCards.length}</div>
          <div className="text-slate-500">по данным текущего snapshot 051</div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Сводка системы
        </div>
        <p className="mt-2 text-xl leading-relaxed text-slate-700 lg:text-3xl">
          По данным 051 сейчас зарегистрировано{' '}
          <b className="text-blue-700">{outageSummary?.activeIncidents ?? 0} активных событий</b>,
          из них {getOutageKindLabel('emergency', 'genitivePlural')} — <b>{emergencyLive.length}</b>.
          Наибольшая нагрузка по домам наблюдается в районах{' '}
          {outageSummary?.topDistricts.slice(0, 2).map((item) => item.district).join(' и ') ||
            'без выраженного лидера'}
          .
        </p>
        {liveStatus051 && (
          <SourceMetaFooter
            source={formatSourceLabel(liveStatus051.sourceUrl, '051.novo-sibirsk.ru')}
            updatedAt={liveStatus051.updatedAt}
            ttl={`${liveStatus051.ttlMinutes} мин`}
            type={sourceTypeLabels[liveStatus051.type] ?? liveStatus051.type}
            status={liveStatus051.status}
          />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-3 text-2xl font-bold">Активные события ЖКХ</div>
          {incidents
            .filter((incident) => incident.sourceKind === 'live')
            .slice(0, 5)
            .map((incident) => (
              <button
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold">{incident.title}</div>
                  <div className="text-sm text-slate-500">{incident.summary}</div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  {new Date(incident.detectedAt).toLocaleTimeString('ru-RU')}
                </div>
              </button>
            ))}
        </Card>
        <Card className="lg:col-span-5">
          <div className="mb-3 text-2xl font-bold">Нагрузка по районам</div>
          <div className="space-y-2">
            {districtCards.slice(0, 5).map((item) => (
              <div key={item.districtName} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{item.districtName}</span>
                  <span className="text-sm text-slate-500">{item.incidents} событий</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">Отключенных домов: {item.houses}</div>
              </div>
            ))}
          </div>
          {liveStatus051 && (
            <SourceMetaFooter
              source={formatSourceLabel(liveStatus051.sourceUrl, '051.novo-sibirsk.ru')}
              updatedAt={liveStatus051.updatedAt}
              ttl={`${liveStatus051.ttlMinutes} мин`}
              type={sourceTypeLabels[liveStatus051.type] ?? liveStatus051.type}
              status={liveStatus051.status}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
