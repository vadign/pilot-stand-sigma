import type { EducationDistrictStats } from '../types'

export const DistrictStats = ({ stats }: { stats: EducationDistrictStats[] }) => (
  <div className="overflow-auto rounded-xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50"><tr><th className="p-2 text-left">Район</th><th>Школ</th><th>Детсадов</th><th>Жилых зданий</th><th>Зданий/школу</th><th>Зданий/детсад</th></tr></thead>
      <tbody>{stats.map((item) => <tr key={item.district} className="border-t"><td className="p-2">{item.district}</td><td className="text-center">{item.schools}</td><td className="text-center">{item.kindergartens}</td><td className="text-center">{item.residentialBuildings}</td><td className="text-center">{item.buildingsPerSchool}</td><td className="text-center">{item.buildingsPerKindergarten}</td></tr>)}</tbody>
    </table>
  </div>
)
