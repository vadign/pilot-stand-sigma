import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Card, MetaGrid, SectionTitle } from '../../components/ui'
import { selectOutageSummary, selectSourceStatuses } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'

export default function DeputiesPage() {
  const { deputies, setDeputyMode } = useSigmaStore()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const statuses = useSigmaStore(selectSourceStatuses)
  const [selectedId, setSelectedId] = useState(deputies[0].id)
  const deputy = deputies.find((item) => item.id === selectedId)!

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-9">
        <Card>
          <SectionTitle
            title="Цифровые заместители"
            subtitle="Заместитель по энергетике и ЖКХ получает показатели 051 и статус обновления источника."
          />
        </Card>

        <Card>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-4xl font-bold">{deputy.name}</div>
            <Badge text="активен" className="bg-emerald-50 text-emerald-700" />
          </div>
          <MetaGrid
            items={[
              { label: 'Активные события', value: String(liveSummary?.activeIncidents ?? 0) },
              {
                label: 'Районы в фокусе',
                value: liveSummary?.topDistricts.slice(0, 3).map((item) => item.district).join(', ') || '—',
              },
              { label: 'Источник', value: statuses.find((item) => item.key === '051')?.title ?? '051' },
              {
                label: 'Последнее обновление',
                value: statuses.find((item) => item.key === '051')?.updatedAt
                  ? new Date(statuses.find((item) => item.key === '051')!.updatedAt!).toLocaleString('ru-RU')
                  : '—',
              },
            ]}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Операционный режим
              </div>
              {(['recommendation', 'approval', 'autonomous'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDeputyMode(deputy.id, mode)}
                  className={`mb-2 block w-full rounded-xl border p-3 text-left ${
                    deputy.mode === mode ? 'border-blue-300 bg-blue-50' : ''
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Лента производительности
              </div>
              {deputy.latestActions.map((action, index) => (
                <div key={index} className="mb-2 rounded-xl border p-2">
                  <CheckCircle2 size={14} className="mr-1 inline text-blue-600" />
                  {action}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-3">
        <Card>
          <div className="mb-2 text-xl font-bold">Ожидающие и другие заместители</div>
          {deputies.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`mb-2 w-full rounded-xl border p-3 text-left ${
                item.id === selectedId ? 'border-blue-300 bg-blue-50' : ''
              }`}
            >
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-slate-500">Режим: {item.mode}</div>
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}
