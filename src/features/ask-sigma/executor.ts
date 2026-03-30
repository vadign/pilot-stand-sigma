import type { AskSigmaResult, AskSigmaPlan, SigmaRole } from './types'
import type { AskSigmaProvider } from './provider'
import { supportedQuestions } from './suggestedQuestions'
import { createExecutionContext } from './execution/context'
import { operationHandlers } from './execution/operationHandlers'

const createUnknownResult = ({
  text,
  explainBase,
}: {
  text: string
  explainBase: ReturnType<typeof createExecutionContext>['explainBase']
}): AskSigmaResult => ({
  type: 'UNKNOWN',
  title: 'Сигма пока не знает эту тему',
  summary: /транспорт|остановк|маршрут|тариф|проезд/i.test(text)
    ? 'Уточните транспортный запрос. Например: «остановки в советском районе», «какие остановки у маршрута 36», «как проехать из академгородка в центральный район».'
    : 'Попробуйте один из поддерживаемых запросов ниже.',
  hints: supportedQuestions,
  explain: explainBase,
})

export const executePlan = (
  plan: AskSigmaPlan,
  provider: AskSigmaProvider,
  role: SigmaRole,
  options?: { implicitDistrict?: string },
): AskSigmaResult => {
  const execution = createExecutionContext(plan, provider, role, options)
  const handler = operationHandlers[plan.operation]

  return handler ? handler(execution) : createUnknownResult({ text: plan.text, explainBase: execution.explainBase })
}
