import { useEffect, useMemo, useState } from 'react'
import { Circle, Map, Placemark, YMaps } from '@pbe/react-yandex-maps'
import { Badge, Card, SectionTitle } from '../../components/ui'
import { buildEducationDistrictStats, filterEducationInstitutions, searchEducationInstitutions } from './selectors'
import type { EducationInstitution, EducationKindFilter, EducationSnapshot } from './types'

const snapshotPath = '/education/novosibirsk-education-snapshot.json'
const markerColorByKind = {
  school: '#2563eb',
  kindergarten: '#f97316',
} as const
const fillColorByKind = {
  school: 'rgba(37, 99, 235, 0.08)',
  kindergarten: 'rgba(249, 115, 22, 0.10)',
} as const
const coverageRadiusMetersByKind = {
  school: 900,
  kindergarten: 500,
} as const
const novosibirskOverviewMapState = {
  center: [55.03, 82.98] as [number, number],
  zoom: 8,
} as const

const hasCoordinates = (
  institution: EducationInstitution,
): institution is EducationInstitution & { coordinates: [number, number] } => Array.isArray(institution.coordinates)

export const SchoolsKindergartensPage = ({ embedded = false }: { embedded?: boolean }) => {
  const [snapshot, setSnapshot] = useState<EducationSnapshot>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [district, setDistrict] = useState('')
  const [kind, setKind] = useState<EducationKindFilter>('all')
  const [tableQuery, setTableQuery] = useState('')
  const [showCoverage, setShowCoverage] = useState(true)

  useEffect(() => {
    let cancelled = false

    void fetch(snapshotPath, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`snapshot fetch failed: ${response.status}`)
        return response.json() as Promise<EducationSnapshot>
      })
      .then((payload) => {
        if (cancelled) return
        setSnapshot(payload)
        setError(undefined)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить snapshot школ и детских садов')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleInstitutions = useMemo(() =>
    filterEducationInstitutions(snapshot?.institutions ?? [], district, kind)
  , [district, kind, snapshot?.institutions])
  const tableInstitutions = useMemo(() =>
    searchEducationInstitutions(visibleInstitutions, tableQuery)
  , [tableQuery, visibleInstitutions])
  const districtStats = useMemo(() => buildEducationDistrictStats(snapshot?.institutions ?? []), [snapshot?.institutions])
  const visibleDistrictStats = useMemo(() => buildEducationDistrictStats(visibleInstitutions), [visibleInstitutions])
  const visibleGeocoded = useMemo(() => visibleInstitutions.filter(hasCoordinates), [visibleInstitutions])
  const totalSchools = visibleInstitutions.filter((item) => item.kind === 'school').length
  const totalKindergartens = visibleInstitutions.filter((item) => item.kind === 'kindergarten').length
  const districtOptions = snapshot?.districts ?? []
  const districtCoverageCount = visibleDistrictStats.length
  const leadingDistrict = visibleDistrictStats[0]

  return (
    <div className="space-y-4">
      {!embedded && (
        <SectionTitle
          title="Школы и детские сады"
          subtitle="Карта и районная аналитика по обеспеченности Новосибирска школами и детскими садами."
        />
      )}

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Социальная инфраструктура</div>
            <div className="text-3xl font-bold">Школы и детские сады Новосибирска</div>
            <div className="max-w-4xl text-sm text-slate-600">
              Панель помогает быстро оценить обеспеченность районов школами и детскими садами, увидеть потенциальные зоны дефицита и понять, какие жилые территории попадают в зону доступности социальной инфраструктуры.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded-xl border px-3 py-2" value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="">Все районы</option>
              {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-xl border px-3 py-2" value={kind} onChange={(event) => setKind(event.target.value as EducationKindFilter)}>
              <option value="all">Все учреждения</option>
              <option value="school">Только школы</option>
              <option value="kindergarten">Только детские сады</option>
            </select>
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <input type="checkbox" checked={showCoverage} onChange={() => setShowCoverage((value) => !value)} />
              Зоны покрытия
            </label>
          </div>
        </div>
      </Card>

      {loading && <Card>Загружаю snapshot школ и детских садов…</Card>}
      {error && <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card>}

      {!loading && !error && snapshot && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="text-sm text-slate-500">Районов в контуре</div>
              <div className="mt-2 text-5xl font-bold">{districtCoverageCount}</div>
            </Card>
            <Card><div className="text-sm text-slate-500">Школы</div><div className="mt-2 text-5xl font-bold text-blue-600">{totalSchools}</div></Card>
            <Card><div className="text-sm text-slate-500">Детские сады</div><div className="mt-2 text-5xl font-bold text-orange-500">{totalKindergartens}</div></Card>
            <Card>
              <div className="text-sm text-slate-500">Лидер по числу учреждений</div>
              <div className="mt-2 text-5xl font-bold text-emerald-600">{leadingDistrict?.total ?? 0}</div>
              {leadingDistrict && <div className="mt-2 text-sm text-slate-500">{leadingDistrict.district}</div>}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="text-3xl font-bold">Карта учреждений</div>
                  <Badge text="школы" className="bg-blue-50 text-blue-700" />
                  <Badge text="детские сады" className="bg-orange-50 text-orange-700" />
                  {showCoverage && <Badge text="приближенные зоны покрытия" className="bg-emerald-50 text-emerald-700" />}
                </div>

                <div className="h-[460px] overflow-hidden rounded-2xl border border-slate-200">
                  <YMaps query={{ lang: 'ru_RU' }}>
                    <Map state={novosibirskOverviewMapState} width="100%" height="100%" options={{ suppressMapOpenBlock: true }}>
                      {showCoverage && visibleGeocoded.map((institution) => (
                        <Circle
                          key={`coverage-${institution.id}`}
                          geometry={[institution.coordinates, coverageRadiusMetersByKind[institution.kind]]}
                          options={{
                            fillColor: fillColorByKind[institution.kind],
                            strokeColor: markerColorByKind[institution.kind],
                            strokeOpacity: 0.18,
                            strokeWidth: 1,
                          }}
                        />
                      ))}
                      {visibleGeocoded.map((institution) => (
                        <Placemark
                          key={institution.id}
                          geometry={institution.coordinates}
                          properties={{
                            balloonContentHeader: institution.name,
                            balloonContentBody: `<div>${institution.address}</div><div>${institution.phone ?? 'Телефон не указан'}</div>`,
                            hintContent: institution.name,
                            iconCaption: institution.kind === 'school' ? 'Школа' : 'Детсад',
                          }}
                          options={{
                            preset: 'islands#circleDotIcon',
                            iconColor: markerColorByKind[institution.kind],
                          }}
                          modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                        />
                      ))}
                    </Map>
                  </YMaps>
                </div>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <Card>
                <div className="mb-3 text-2xl font-bold">Статистика по районам</div>
                <div className="space-y-2">
                  {districtStats.map((item) => (
                    <div key={item.district} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{item.district}</span>
                        <span className="text-sm text-slate-500">{item.total} учреждений</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Школы: {item.schoolCount} · Детсады: {item.kindergartenCount}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Мест в детсадах: {item.kindergartenCapacity} · На карте: {item.geocodedCount}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-3xl font-bold">Все учреждения</div>
              <input
                value={tableQuery}
                onChange={(event) => setTableQuery(event.target.value)}
                placeholder="Поиск по названию, району или адресу"
                className="w-full rounded-xl border px-3 py-2 lg:max-w-md"
              />
            </div>
            <div className="max-h-[560px] overflow-auto rounded-xl border">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left">
                  <tr>
                    <th className="border-b px-3 py-2">Тип</th>
                    <th className="border-b px-3 py-2">Название</th>
                    <th className="border-b px-3 py-2">Район</th>
                    <th className="border-b px-3 py-2">Адрес</th>
                    <th className="border-b px-3 py-2">Контакты</th>
                  </tr>
                </thead>
                <tbody>
                  {tableInstitutions.map((institution) => (
                    <tr key={institution.id} className="align-top odd:bg-white even:bg-slate-50/40">
                      <td className="border-b px-3 py-2">
                        <Badge
                          text={institution.kind === 'school' ? 'Школа' : 'Детсад'}
                          className={institution.kind === 'school' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                        />
                      </td>
                      <td className="border-b px-3 py-2 font-medium">{institution.name}</td>
                      <td className="border-b px-3 py-2 text-slate-600">{institution.district}</td>
                      <td className="border-b px-3 py-2 text-slate-600">
                        <div>{institution.address}</div>
                        {!institution.coordinates && <div className="mt-1 text-xs text-red-600">Координаты не найдены</div>}
                      </td>
                      <td className="border-b px-3 py-2 text-slate-600">
                        <div>{institution.phone ?? '—'}</div>
                        {institution.site && <a href={institution.site} target="_blank" rel="noreferrer" className="block text-blue-700 underline">{institution.site}</a>}
                      </td>
                    </tr>
                  ))}
                  {tableInstitutions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        Ничего не найдено по текущему поисковому запросу.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
