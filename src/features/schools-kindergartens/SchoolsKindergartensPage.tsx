import { useEffect, useMemo, useState } from 'react'
import { Card, SectionTitle, Badge } from '../../components/ui'
import { useSigmaStore } from '../../store/useSigmaStore'
import { buildCoverageModel } from './utils/buildCoverageModel'
import { computeDistrictStats, districtCoverageRatio, topLoadedDistrictsForKindergartens, topLoadedDistrictsForSchools, totalKindergartens, totalSchools } from './selectors'
import { KindergartensProvider } from './providers/KindergartensProvider'
import { ResidentialBuildingsProvider } from './providers/ResidentialBuildingsProvider'
import { SchoolsProvider } from './providers/SchoolsProvider'
import { CoverageLegend } from './components/CoverageLegend'
import { CoverageModeSwitch } from './components/CoverageModeSwitch'
import { DistrictStats } from './components/DistrictStats'
import { EducationFilters, type EducationFiltersValue } from './components/EducationFilters'
import { EducationMap } from './components/EducationMap'
import { InstitutionDetailsDrawer } from './components/InstitutionDetailsDrawer'
import { InstitutionList } from './components/InstitutionList'
import type { CoverageConfig, EducationInstitution, Kindergarten, ResidentialBuilding, School } from './types'

const schoolsProvider = new SchoolsProvider()
const kindergartensProvider = new KindergartensProvider()
const buildingsProvider = new ResidentialBuildingsProvider()
const defaultFilters: EducationFiltersValue = { district: '', institutionType: 'all', search: '', address: '', coverageLayer: 'both' }

export const SchoolsKindergartensPage = () => {
  const mode = useSigmaStore((s) => s.sourceMode)
  const [schools, setSchools] = useState<School[]>([])
  const [kindergartens, setKindergartens] = useState<Kindergarten[]>([])
  const [buildings, setBuildings] = useState<ResidentialBuilding[]>([])
  const [statuses, setStatuses] = useState<{ key: string; title: string; dataType: string; source: string; status: string }[]>([])
  const [filters, setFilters] = useState(defaultFilters)
  const [coverageConfig, setCoverageConfig] = useState<CoverageConfig>({ mode: 'nearest', schoolRadiusMeters: 1200, kindergartenRadiusMeters: 700 })
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsId, setDetailsId] = useState<string>()

  useEffect(() => {
    void Promise.all([schoolsProvider.load(mode), kindergartensProvider.load(mode), buildingsProvider.load(mode)]).then(([schoolsResult, kResult, bResult]) => {
      setSchools(schoolsResult.schools)
      setKindergartens(kResult.kindergartens)
      setBuildings(bResult.buildings)
      setStatuses([schoolsResult.status, kResult.status, bResult.status])
    })
  }, [mode])

  const institutions = useMemo<EducationInstitution[]>(() => [...schools, ...kindergartens], [schools, kindergartens])

  const filteredInstitutions = useMemo(() => institutions.filter((item) => {
    if (filters.district && item.district !== filters.district) return false
    if (filters.institutionType !== 'all' && item.dataTypeEntity !== filters.institutionType) return false
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.address && !item.addressRaw.toLowerCase().includes(filters.address.toLowerCase())) return false
    return true
  }), [filters, institutions])

  const schoolCoverage = useMemo(() => buildCoverageModel(institutions, buildings, 'school', coverageConfig), [institutions, buildings, coverageConfig])
  const kindergartenCoverage = useMemo(() => buildCoverageModel(institutions, buildings, 'kindergarten', coverageConfig), [institutions, buildings, coverageConfig])
  const assignments = useMemo(() => [...schoolCoverage.assignments, ...kindergartenCoverage.assignments], [schoolCoverage.assignments, kindergartenCoverage.assignments])
  const zones = useMemo(() => [
    ...(filters.coverageLayer === 'kindergartens' ? [] : schoolCoverage.zones),
    ...(filters.coverageLayer === 'schools' ? [] : kindergartenCoverage.zones),
  ], [filters.coverageLayer, kindergartenCoverage.zones, schoolCoverage.zones])
  const districtStats = useMemo(() => computeDistrictStats(schools, kindergartens, buildings, assignments), [schools, kindergartens, buildings, assignments])

  const selectedInstitution = institutions.find((item) => item.id === detailsId)
  const districts = Array.from(new Set(institutions.map((item) => item.district))).sort((a, b) => a.localeCompare(b, 'ru'))

  return (
    <div className="space-y-4">
      <SectionTitle title="Школы и детские сады" subtitle="Реальные данные из opendata.novo-sibirsk.ru (ID 28 / ID 27) и OpenStreetMap/Overpass." />
      <EducationFilters filters={filters} districts={districts} coverage={coverageConfig} onFilters={setFilters} onCoverage={setCoverageConfig} onReset={() => setFilters(defaultFilters)} />
      <CoverageModeSwitch config={coverageConfig} onChange={setCoverageConfig} />
      <CoverageLegend />

      <Card>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div>Всего школ: <b>{totalSchools(schools)}</b></div>
          <div>Всего детсадов: <b>{totalKindergartens(kindergartens)}</b></div>
          <div>Районов с учреждениями: <b>{districts.length}</b></div>
          <div>Учреждений в фильтре: <b>{filteredInstitutions.length}</b></div>
          <div>Жилых зданий в модели: <b>{buildings.length}</b></div>
          <div>Покрытие школами: <b>{(districtCoverageRatio(assignments, buildings, 'school') * 100).toFixed(1)}%</b></div>
          <div>Покрытие детсадами: <b>{(districtCoverageRatio(assignments, buildings, 'kindergarten') * 100).toFixed(1)}%</b></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{statuses.map((status) => <Badge key={status.key} text={`Источник: ${status.title} · ${status.dataType} · ${status.source} · ${status.status}`} />)}</div>
      </Card>

      <Card><EducationMap institutions={filteredInstitutions} zones={zones} buildings={buildings} selectedId={selectedId} /></Card>
      <Card><DistrictStats stats={districtStats} /></Card>
      <Card>
        <div className="mb-2 text-sm">Топ районов по нагрузке: школы — {topLoadedDistrictsForSchools(districtStats).map((item) => item.district).join(', ') || '—'}; детсады — {topLoadedDistrictsForKindergartens(districtStats).map((item) => item.district).join(', ') || '—'}.</div>
        <InstitutionList institutions={filteredInstitutions} assignments={assignments} onShow={setSelectedId} onDetails={setDetailsId} />
      </Card>
      <InstitutionDetailsDrawer institution={selectedInstitution} onClose={() => setDetailsId(undefined)} />
    </div>
  )
}
