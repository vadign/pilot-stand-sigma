import { Badge } from '../../../../components/ui'
import type { AskSigmaResult } from '../../types'

export const ResultMeta = ({ result }: { result: AskSigmaResult }) => (
  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
    <Badge text={`source: ${result.explain.source}`} />
    <Badge text={`type: ${result.explain.dataType}`} />
    <Badge text={new Date(result.explain.updatedAt).toLocaleString('ru-RU')} />
  </div>
)
