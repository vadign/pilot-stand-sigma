import type { CoverageAssignment, EducationInstitution } from '../types'

export const InstitutionList = ({
  institutions,
  assignments,
  onShow,
  onDetails,
}: {
  institutions: EducationInstitution[]
  assignments: CoverageAssignment[]
  onShow: (id: string) => void
  onDetails: (id: string) => void
}) => (
  <div className="space-y-2">
    {institutions.map((item) => {
      const assigned = assignments.filter((a) => a.institutionId === item.id).length
      return <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="font-semibold">{item.name}</div><div>{item.dataTypeEntity === 'school' ? 'Школа' : 'Детский сад'} · {item.district}</div><div>{item.addressRaw || 'Адрес не указан'}</div><div>Телефон: {item.phone || '—'} · Руководитель: {item.director || '—'}</div><div>Координаты: {item.coordinates ? item.coordinates.origin : 'нет'} · Assigned buildings: {assigned}</div><div className="mt-2 flex gap-2"><button className="rounded-lg border px-2 py-1" onClick={() => onShow(item.id)}>На карте</button><button className="rounded-lg border px-2 py-1" onClick={() => onDetails(item.id)}>Подробно</button></div></div>
    })}
  </div>
)
