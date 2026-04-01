import { getDistrictAnswerName } from '../../lib/districts'
import { attachPresentationCommands } from '../presentation/actionCommands'
import { executePlan } from './executor'
import { normalizeQuery } from './normalize'
import { createPlan } from './planner'
import type { AskSigmaProvider } from './provider'
import type { AskSigmaResult, SigmaRole } from './types'

export interface AskSigmaRunResult {
  normalizedQuery: ReturnType<typeof normalizeQuery>
  plan: ReturnType<typeof createPlan>
  result: AskSigmaResult
  roleChange?: {
    role: SigmaRole
    district?: string
  }
}

export const runAskSigmaQuery = ({
  query,
  provider,
  role,
  implicitDistrict,
}: {
  query: string
  provider: AskSigmaProvider
  role: SigmaRole
  implicitDistrict?: string
}): AskSigmaRunResult => {
  const normalizedQuery = normalizeQuery(query)
  const plan = createPlan(normalizedQuery)

  if (plan.role) {
    return {
      normalizedQuery,
      plan,
      roleChange: { role: plan.role, district: plan.district },
      result: attachPresentationCommands({
        type: 'ROLE_SWITCH',
        title: 'Роль обновлена',
        summary: `Текущая роль: ${plan.role}${plan.district ? `, район: ${getDistrictAnswerName(plan.district)}` : ''}`,
        explain: {
          dataType: 'pilot',
          source: 'Голосовая или текстовая команда',
          updatedAt: new Date().toISOString(),
        },
      }),
    }
  }

  return {
    normalizedQuery,
    plan,
    result: attachPresentationCommands(executePlan(plan, provider, role, { implicitDistrict })),
  }
}
