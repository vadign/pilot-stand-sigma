import type { EducationInstitution } from '../types'

export const InstitutionDetailsDrawer = ({ institution, onClose }: { institution?: EducationInstitution; onClose: () => void }) => {
  if (!institution) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between"><b>{institution.name}</b><button onClick={onClose}>Закрыть</button></div>
      <div>Тип: {institution.dataTypeEntity === 'school' ? 'Школа' : 'Детский сад'}</div>
      <div>Район: {institution.district}</div>
      <div>Адрес: {institution.addressRaw}</div>
      <div>Источник: {institution.source}</div>
      <div>Тип данных: {institution.dataType}</div>
      <div>Обновлено: {new Date(institution.updatedAt).toLocaleString('ru-RU')}</div>
    </div>
  )
}
