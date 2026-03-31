import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, CollapsibleCardSection, SectionTitle } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { EducationMap } from './components/EducationMap'
import { hasInstitutionCoordinates } from './mapPresentation'
import { buildEducationDistrictStats, filterEducationInstitutions, searchEducationInstitutions } from './selectors'
import type { EducationKindFilter, EducationSnapshot } from './types'

const snapshotPath = '/education/novosibirsk-education-snapshot.json'

type EducationPrimaryViewMode = 'map' | 'list'

export const SchoolsKindergartensPage = ({ embedded = false }: { embedded?: boolean }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [snapshot, setSnapshot] = useState<EducationSnapshot>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [district, setDistrict] = useState('')
  const [kind, setKind] = useState<EducationKindFilter>('all')
  const [tableQuery, setTableQuery] = useState('')
  const [showCoverage, setShowCoverage] = useState(true)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<EducationPrimaryViewMode>(() =>
    embedded && !isDesktop ? 'list' : 'map',
  )

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
  const visibleGeocoded = useMemo(() => visibleInstitutions.filter(hasInstitutionCoordinates), [visibleInstitutions])
  const totalSchools = visibleInstitutions.filter((item) => item.kind === 'school').length
  const totalKindergartens = visibleInstitutions.filter((item) => item.kind === 'kindergarten').length
  const districtOptions = snapshot?.districts ?? []
  const districtCoverageCount = visibleDistrictStats.length
  const leadingDistrict = visibleDistrictStats[0]
  const isEmbeddedMobile = embedded && !isDesktop
  const primaryViewSummary = viewMode === 'map'
    ? `На карте: ${visibleGeocoded.length} учреждений`
    : `В списке: ${tableInstitutions.length} учреждений`
  const introductionText = isEmbeddedMobile
    ? 'Учреждения, районы и покрытие в одном мобильном контуре.'
    : 'Панель помогает быстро оценить обеспеченность районов школами и детскими садами, увидеть потенциальные зоны дефицита и понять, какие жилые территории попадают в зону доступности социальной инфраструктуры.'

  useEffect(() => {
    if (selectedInstitutionId && !visibleInstitutions.some((institution) => institution.id === selectedInstitutionId)) {
      setSelectedInstitutionId(null)
    }
  }, [selectedInstitutionId, visibleInstitutions])

  useEffect(() => {
    if (!embedded) return
    setViewMode(isDesktop ? 'map' : 'list')
  }, [embedded, isDesktop])

  const institutionsTable = (
    <div data-testid="education-institution-list" className="w-full min-w-0 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <input
          value={tableQuery}
          onChange={(event) => setTableQuery(event.target.value)}
          placeholder="Поиск по названию, району или адресу"
          className="w-full rounded-xl border px-3 py-2 lg:max-w-md"
        />
      </div>
      <div
        data-testid="education-institution-table-scroll"
        className="max-h-[560px] w-full max-w-full overflow-x-auto overflow-y-auto rounded-xl border"
      >
        <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left">
            <tr>
              <th className="w-[84px] border-b px-3 py-2">Тип</th>
              <th className="w-[180px] border-b px-3 py-2">Учреждение</th>
              <th className="w-[216px] border-b px-3 py-2">Адрес и связь</th>
            </tr>
          </thead>
          <tbody>
            {tableInstitutions.map((institution) => (
              <tr
                key={institution.id}
                data-testid="education-institution-list-item"
                className={`cursor-pointer align-top odd:bg-white even:bg-slate-50/40 ${
                  institution.id === selectedInstitutionId ? 'bg-blue-50/70' : ''
                }`}
                onClick={() => setSelectedInstitutionId(institution.id)}
              >
                <td className="border-b px-3 py-2">
                  <Badge
                    text={institution.kind === 'school' ? 'Школа' : 'Детсад'}
                    className={institution.kind === 'school' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                  />
                </td>
                <td className="border-b px-3 py-2">
                  <div className="break-words font-medium text-slate-900">{institution.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{institution.district}</div>
                </td>
                <td className="border-b px-3 py-2 text-slate-600">
                  <div className="break-words">{institution.address}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Телефон: {institution.phone ?? '—'}
                  </div>
                  {!hasInstitutionCoordinates(institution) && <div className="mt-1 text-xs text-red-600">Координаты не найдены</div>}
                  {institution.site && (
                    <a
                      href={institution.site}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-xs text-blue-700 underline"
                    >
                      {institution.site}
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {tableInstitutions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  Ничего не найдено по текущему поисковому запросу.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const contourSummaryContent = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <div className="text-sm text-slate-500">Районов в контуре</div>
        <div className="mt-2 text-5xl font-bold">{districtCoverageCount}</div>
      </Card>
      <Card>
        <div className="text-sm text-slate-500">Школы</div>
        <div className="mt-2 text-5xl font-bold text-blue-600">{totalSchools}</div>
      </Card>
      <Card>
        <div className="text-sm text-slate-500">Детские сады</div>
        <div className="mt-2 text-5xl font-bold text-orange-500">{totalKindergartens}</div>
      </Card>
      <Card>
        <div className="text-sm text-slate-500">Лидер по числу учреждений</div>
        <div className="mt-2 text-5xl font-bold text-emerald-600">{leadingDistrict?.total ?? 0}</div>
        {leadingDistrict && <div className="mt-2 text-sm text-slate-500">{leadingDistrict.district}</div>}
      </Card>
    </div>
  )

  const districtStatsContent = (
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
  )

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
            <div className="text-2xl font-bold break-words sm:text-3xl">Школы и детские сады Новосибирска</div>
            <div className="max-w-4xl text-sm text-slate-600">
              {introductionText}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="w-full min-w-0 rounded-xl border px-3 py-2 sm:w-auto" value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="">Все районы</option>
              {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="w-full min-w-0 rounded-xl border px-3 py-2 sm:w-auto" value={kind} onChange={(event) => setKind(event.target.value as EducationKindFilter)}>
              <option value="all">Все учреждения</option>
              <option value="school">Только школы</option>
              <option value="kindergarten">Только детские сады</option>
            </select>
            {!isEmbeddedMobile && (
              <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                <input type="checkbox" checked={showCoverage} onChange={() => setShowCoverage((value) => !value)} />
                Зоны покрытия
              </label>
            )}
          </div>
        </div>
      </Card>

      {loading && <Card>Загружаю snapshot школ и детских садов…</Card>}
      {error && <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card>}

      {!loading && !error && snapshot && (
        <>
          {!isEmbeddedMobile && contourSummaryContent}

          <div className="grid gap-4 lg:grid-cols-12">
            {!isEmbeddedMobile && (
              <div className="lg:col-span-8">
                <Card>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="text-2xl font-bold break-words sm:text-3xl">
                        {viewMode === 'map' ? 'Карта учреждений' : 'Список учреждений'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge text="школы" className="bg-blue-50 text-blue-700" />
                        <Badge text="детские сады" className="bg-orange-50 text-orange-700" />
                        {viewMode === 'map' && showCoverage && <Badge text="приближенные зоны покрытия" className="bg-emerald-50 text-emerald-700" />}
                        {viewMode === 'map' && <Badge text="кластеры по клику раскрываются" className="bg-slate-100 text-slate-700" />}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="text-sm text-slate-500">{primaryViewSummary}</div>
                      {embedded && (
                        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => setViewMode('map')}
                            aria-pressed={viewMode === 'map'}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              viewMode === 'map'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Карта
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            aria-pressed={viewMode === 'list'}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              viewMode === 'list'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Список
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {viewMode === 'map' ? (
                    <>
                      <div className="mb-3 text-sm text-slate-500">
                        На дальнем масштабе точки объединяются в кластеры. Подписи показываются выборочно и без критических наложений, а выбранное учреждение подсвечивается.
                      </div>
                      <EducationMap
                        institutions={visibleGeocoded}
                        showCoverage={showCoverage}
                        selectedInstitutionId={selectedInstitutionId}
                        onSelectInstitution={setSelectedInstitutionId}
                      />
                    </>
                  ) : (
                    institutionsTable
                  )}
                </Card>
              </div>
            )}

            <div className="space-y-4 lg:col-span-4">
              {isEmbeddedMobile ? (
                <>
                  <CollapsibleCardSection
                    mobile
                    title="Сводка по контуру"
                    summary={`${visibleInstitutions.length} учреждений в текущей выборке`}
                    titleClassName="text-lg font-bold"
                  >
                    {contourSummaryContent}
                  </CollapsibleCardSection>
                  <CollapsibleCardSection
                    mobile
                    title="Районная аналитика"
                    summary={leadingDistrict ? `Лидер: ${leadingDistrict.district}` : 'Нет данных по районам'}
                    titleClassName="text-lg font-bold"
                  >
                    {districtStatsContent}
                  </CollapsibleCardSection>
                </>
              ) : (
                <Card>
                  <div className="mb-3 text-2xl font-bold">Статистика по районам</div>
                  {districtStatsContent}
                </Card>
              )}
            </div>
          </div>

          {!embedded && (
            <Card>
              <div className="mb-3 text-3xl font-bold">Все учреждения</div>
              {institutionsTable}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
