import { Link } from 'react-router-dom'
import { Card } from '../../../../components/ui'
import type { AskSigmaResult } from '../../types'
import { ResultMeta } from './common'

export const ResultRenderer = ({ result, onAction }: { result: AskSigmaResult; onAction: (route?: string, district?: string) => void }) => {
  return (
    <Card>
      <h3 className="text-xl font-bold">{result.title}</h3>
      {result.summary && <p className="mt-2 text-sm text-slate-600">{result.summary}</p>}

      {result.kpis && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {result.kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border p-2 text-sm"><div className="text-slate-500">{kpi.label}</div><div className="font-semibold">{kpi.value}</div></div>
          ))}
        </div>
      )}

      {result.incidents && (
        <div className="mt-3 space-y-2">
          {result.incidents.map((incident) => (
            <div key={incident.id} className="rounded-lg border p-2 text-sm">
              <div className="font-semibold">{incident.title}</div>
              <div>{incident.severity} · {incident.status} · {incident.district}</div>
              <button className="mt-2 rounded border px-2 py-1" onClick={() => onAction(`/incidents/${incident.id}`, incident.district)}>Открыть</button>
            </div>
          ))}
        </div>
      )}

      {result.approvals && (
        <ul className="mt-3 space-y-2 text-sm">
          {result.approvals.map((item) => <li key={item.id} className="rounded border p-2">{item.id}: {item.reason} · {item.initiator}</li>)}
        </ul>
      )}

      {result.regulations && (
        <ul className="mt-3 space-y-2 text-sm">
          {result.regulations.map((regulation) => <li key={regulation.id} className="rounded border p-2">{regulation.code} · {regulation.title}</li>)}
        </ul>
      )}

      {result.deputy && <div className="mt-3 rounded border p-2 text-sm">{result.deputy.name} · режим {result.deputy.mode}</div>}

      {result.compare && (
        <div className="mt-3 rounded border p-2 text-sm">
          <div>{result.compare.baseline} ↔ {result.compare.intervention}</div>
          <ul>{result.compare.effects.map((effect) => <li key={effect}>• {effect}</li>)}</ul>
        </div>
      )}

      {result.hints && <ul className="mt-3 list-disc pl-5 text-sm">{result.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>}

      <div className="mt-3 flex flex-wrap gap-2">
        {result.actions?.map((action) => (
          action.route ?
            <button key={action.label + action.route} onClick={() => onAction(action.route, action.district)} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">{action.label}</button>
            : <Link key={action.label} to="#" className="rounded border px-3 py-1.5 text-sm">{action.label}</Link>
        ))}
      </div>
      <ResultMeta result={result} />
    </Card>
  )
}
