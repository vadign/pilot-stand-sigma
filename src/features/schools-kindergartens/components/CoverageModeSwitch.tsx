import type { CoverageConfig } from '../types'

export const CoverageModeSwitch = ({ config, onChange }: { config: CoverageConfig; onChange: (value: CoverageConfig) => void }) => (
  <div className="flex flex-wrap gap-2 text-sm">
    <label className="rounded-xl border px-3 py-1.5">Радиус школы, м <input type="number" value={config.schoolRadiusMeters} onChange={(e) => onChange({ ...config, schoolRadiusMeters: Number(e.target.value) || 1200 })} className="ml-2 w-24" /></label>
    <label className="rounded-xl border px-3 py-1.5">Радиус детсада, м <input type="number" value={config.kindergartenRadiusMeters} onChange={(e) => onChange({ ...config, kindergartenRadiusMeters: Number(e.target.value) || 700 })} className="ml-2 w-24" /></label>
  </div>
)
