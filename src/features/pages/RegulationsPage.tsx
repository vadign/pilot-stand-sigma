/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Card, MetaGrid, SectionTitle } from '../../components/ui'
import { useIncidentViews, selectOutageSummary } from '../../live/selectors'
import { useSigmaStore } from '../../store/useSigmaStore'

export default function RegulationsPage() {
  const { regulations, createRegulation } = useSigmaStore()
  const incidents = useIncidentViews()
  const liveSummary = useSigmaStore(selectOutageSummary)
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('ЖКХ')
  const [selected, setSelected] = useState(regulations[0])

  const helper = createColumnHelper<(typeof regulations)[number]>()
  const columns = [
    helper.accessor('code', { header: 'ID правила' }),
    helper.accessor('title', { header: 'Название регламента' }),
    helper.accessor('domain', { header: 'Домен' }),
    helper.accessor('status', { header: 'Статус' }),
  ]

  const table = useReactTable({ data: regulations, columns, getCoreRowModel: getCoreRowModel() })
  const coverage = useMemo(() => {
    const covered = incidents.filter((incident) => incident.linkedRegulationIds.length > 0).length
    return {
      covered,
      total: incidents.length,
      pct: incidents.length === 0 ? 0 : Math.round((covered / incidents.length) * 100),
    }
  }, [incidents])

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          title="Реестр регламентов"
          subtitle="Mock-регламенты сохранены и связаны с типами отключений ЖКХ."
        />
        <MetaGrid
          items={[
            { label: 'События ЖКХ', value: String(liveSummary?.activeIncidents ?? 0) },
            { label: 'Покрытие логики', value: `${coverage.pct}%` },
            { label: 'Рекомендованный домен', value: 'ЖКХ' },
          ]}
        />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="Название правила"
          />
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option>ЖКХ</option>
            <option>Дороги</option>
            <option>Экология</option>
          </select>
          <button
            onClick={() => createRegulation(title || 'Новое правило', domain)}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            Создать правило
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="border-b py-2 text-left text-slate-500">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.slice(0, 10).map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row.original)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 text-3xl font-bold">Инспектор логики</div>
          <div className="mb-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-blue-200">
            utilityType/outageType → регламент ЖКХ
          </div>
          <div className="text-sm text-slate-500">
            {selected.sourceDocument} · {selected.sourceClause}
          </div>
        </Card>
        <Card>
          <div className="mb-2 text-3xl font-bold">Аудит покрытия</div>
          <div className="mb-2 text-sm">
            Покрыто: {coverage.covered}/{coverage.total}
          </div>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 48 }).map((_, index) => (
              <div
                key={index}
                className={`h-5 rounded ${
                  index % 17 === 0
                    ? 'bg-amber-300'
                    : index % 9 === 0
                      ? 'bg-slate-200'
                      : 'bg-emerald-400'
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
