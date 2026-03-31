import type { AskSigmaProvider } from '../provider'
import type { AskSigmaExplain, AskSigmaPlan, AskSigmaResult, SigmaRole } from '../types'

export interface ExecutionContext {
  plan: AskSigmaPlan
  provider: AskSigmaProvider
  role: SigmaRole
  options?: { implicitDistrict?: string }
  context: ReturnType<AskSigmaProvider['getContext']>
  sourceStatuses: NonNullable<ReturnType<AskSigmaProvider['getContext']>['sourceStatuses']>
  explainBase: AskSigmaExplain
}

export type AskSigmaExecutionHandler = (execution: ExecutionContext) => AskSigmaResult

export const createExecutionContext = (
  plan: AskSigmaPlan,
  provider: AskSigmaProvider,
  role: SigmaRole,
  options?: { implicitDistrict?: string },
): ExecutionContext => {
  const context = provider.getContext()
  const sourceStatuses = context.sourceStatuses ?? []
  const primaryStatus = sourceStatuses[0]
  const explainBase: AskSigmaExplain = {
    source: primaryStatus?.title ?? 'Хранилище Сигмы',
    updatedAt: primaryStatus?.updatedAt ?? context.now,
    dataType: primaryStatus?.type ?? 'calculated',
  }

  return {
    plan,
    provider,
    role,
    options,
    context,
    sourceStatuses,
    explainBase,
  }
}
