import type { AskSigmaAction, AskSigmaResult } from '../ask-sigma/types'
import { buildOpenPageCommandFromRoute } from './adapters'

export const resolvePresentationRoute = (action: Pick<AskSigmaAction, 'route' | 'district'>): string | undefined => {
  if (!action.route) return undefined

  if (action.route === '/operations' && action.district) {
    const url = new URL(action.route, 'https://sigma.local')
    url.searchParams.set('district', action.district)
    return `${url.pathname}${url.search}`
  }

  return action.route
}

export const attachPresentationCommandToAction = (action: AskSigmaAction): AskSigmaAction => {
  if (action.presentationCommand) return action

  const route = resolvePresentationRoute(action)
  if (!route) return action

  return {
    ...action,
    presentationCommand: buildOpenPageCommandFromRoute(route, action.label),
  }
}

export const attachPresentationCommands = (result: AskSigmaResult): AskSigmaResult => ({
  ...result,
  actions: result.actions?.map(attachPresentationCommandToAction),
})
