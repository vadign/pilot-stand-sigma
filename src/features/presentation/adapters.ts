import { applyMayorTransportParams, defaultMayorTransportMode, defaultMayorTransportRoute } from '../public-transport/navigation'
import type {
  BriefingPresentationState,
  HistoryPresentationState,
  MayorDashboardPresentationState,
  OperationsPresentationState,
  OtherPresentationState,
  PresentationPageKey,
  PresentationPageState,
  PresentationSubsystemId,
  PresentationPatchPageStateCommand,
  PresentationOpenPageCommand,
} from './types'

const routeBase = 'https://sigma.local'

const validRoutePatterns = [
  /^\/$/,
  /^\/mayor-dashboard(?:\?.*)?$/,
  /^\/briefing(?:\?.*)?$/,
  /^\/operations(?:\?.*)?$/,
  /^\/history(?:\?.*)?$/,
  /^\/scenarios(?:\?.*)?$/,
  /^\/deputies(?:\?.*)?$/,
  /^\/regulations(?:\?.*)?$/,
  /^\/public-transport(?:\?.*)?$/,
  /^\/incidents\/[^/?#]+(?:\/replay)?(?:\?.*)?$/,
] as const

const subsystemTabs = [
  { id: 'heat', title: 'Энергетика' },
  { id: 'transport', title: 'Общественный транспорт' },
  { id: 'education', title: 'Школы и детские сады' },
  { id: 'roads', title: 'Дороги' },
  { id: 'noise', title: 'Шум' },
  { id: 'air', title: 'Воздух' },
] as const satisfies ReadonlyArray<{ id: PresentationSubsystemId; title: string }>

const subsystemLabelById = Object.fromEntries(
  subsystemTabs.map((tab) => [tab.id, tab.title]),
) as Record<PresentationSubsystemId, string>

const operationalSubsystemIds = new Set(['heat', 'roads', 'noise', 'air'])
const historyPeriods = new Set(['7d', '1m', '1q', '1y'])
const historyFocuses = new Set(['trend', 'map', 'categories', 'districts'])
const briefingFocuses = new Set(['summary', 'incidents', 'districts'])
const transportFocuses = new Set(['overview', 'map', 'list', 'hubs', 'fares', 'connectivity'])
const viewModes = new Set(['map', 'list'])

const isPresentationSubsystem = (value: string | null): value is PresentationSubsystemId =>
  subsystemTabs.some((tab) => tab.id === value)

const readSubsystemFromParams = (params: URLSearchParams): PresentationSubsystemId => {
  const value = params.get('subsystem')
  return isPresentationSubsystem(value) ? value : 'heat'
}

const toRoute = (pathname: string, searchParams: URLSearchParams, hash = ''): string => {
  const query = searchParams.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash}`
}

const parseRoute = (route: string) => new URL(route, routeBase)

const readPresentationRoute = (route: string): string => {
  const url = parseRoute(route)
  return `${url.pathname}${url.search}${url.hash}`
}

const normalizeTransportFocus = (value: string | null) =>
  transportFocuses.has(value ?? '') ? value as MayorDashboardPresentationState['focus'] : 'overview'

const normalizeHistoryPeriod = (value: string | null): HistoryPresentationState['period'] =>
  historyPeriods.has(value ?? '') ? value as HistoryPresentationState['period'] : '7d'

const normalizeHistoryFocus = (value: string | null): HistoryPresentationState['focus'] =>
  historyFocuses.has(value ?? '') ? value as HistoryPresentationState['focus'] : 'trend'

const normalizeBriefingFocus = (value: string | null): BriefingPresentationState['focus'] =>
  briefingFocuses.has(value ?? '') ? value as BriefingPresentationState['focus'] : 'summary'

const normalizeViewMode = (value: string | null): MayorDashboardPresentationState['view'] =>
  viewModes.has(value ?? '') ? value as MayorDashboardPresentationState['view'] : 'map'

const normalizeOperationsSubsystem = (value: string | null): OperationsPresentationState['subsystem'] =>
  operationalSubsystemIds.has(value ?? '') ? value as OperationsPresentationState['subsystem'] : 'heat'

const parseMayorDashboardState = (route: string): MayorDashboardPresentationState => {
  const url = parseRoute(route)
  const params = url.searchParams
  const subsystem = url.pathname === '/public-transport' ? 'transport' : readSubsystemFromParams(params)

  return {
    pageKey: 'mayor-dashboard',
    subsystem,
    district: params.get('district') ?? '',
    view: normalizeViewMode(params.get('view')),
    mode: params.get('mode') ?? defaultMayorTransportMode,
    route: params.get('route') ?? defaultMayorTransportRoute,
    fromDistrict: params.get('fromDistrict') ?? '',
    toDistrict: params.get('toDistrict') ?? '',
    focus: normalizeTransportFocus(params.get('focus')),
    pavilionOnly: params.get('pavilion') === '1' || params.get('pavilionOnly') === 'true',
  }
}

const parseOperationsState = (route: string): OperationsPresentationState => {
  const url = parseRoute(route)
  const params = url.searchParams

  return {
    pageKey: 'operations',
    subsystem: normalizeOperationsSubsystem(params.get('subsystem')),
    severity: params.get('severity') ?? '',
    source: (params.get('source') as OperationsPresentationState['source']) || 'all',
    utility: params.get('utility') ?? '',
    outageKind: params.get('outageKind') ?? '',
    district: params.get('district') ?? '',
    selected: params.get('selected') ?? '',
  }
}

const parseBriefingState = (route: string): BriefingPresentationState => {
  const url = parseRoute(route)
  return {
    pageKey: 'briefing',
    focus: normalizeBriefingFocus(url.searchParams.get('focus')),
    incident: url.searchParams.get('incident') ?? '',
  }
}

const parseHistoryState = (route: string): HistoryPresentationState => {
  const url = parseRoute(route)
  return {
    pageKey: 'history',
    period: normalizeHistoryPeriod(url.searchParams.get('period')),
    focus: normalizeHistoryFocus(url.searchParams.get('focus')),
  }
}

const parseOtherState = (route: string): OtherPresentationState => ({
  pageKey: 'other',
  route: readPresentationRoute(route),
})

export const isValidPresentationRoute = (route: string): boolean =>
  route.startsWith('/') &&
  !route.startsWith('/mobile') &&
  !route.startsWith('/display') &&
  validRoutePatterns.some((pattern) => pattern.test(route))

export const getPageKeyFromRoute = (route: string): PresentationPageKey => {
  const pathname = parseRoute(route).pathname

  if (pathname === '/mayor-dashboard' || pathname === '/public-transport') return 'mayor-dashboard'
  if (pathname === '/operations') return 'operations'
  if (pathname === '/briefing') return 'briefing'
  if (pathname === '/history') return 'history'
  return 'other'
}

export const parseRouteToState = (route: string): PresentationPageState => {
  const pageKey = getPageKeyFromRoute(route)

  switch (pageKey) {
    case 'mayor-dashboard':
      return parseMayorDashboardState(route)
    case 'operations':
      return parseOperationsState(route)
    case 'briefing':
      return parseBriefingState(route)
    case 'history':
      return parseHistoryState(route)
    case 'other':
      return parseOtherState(route)
  }
}

export const buildRouteFromState = (state: PresentationPageState): string => {
  switch (state.pageKey) {
    case 'mayor-dashboard': {
      const params = new URLSearchParams()
      if (state.subsystem !== 'heat') params.set('subsystem', state.subsystem)
      if (state.district) params.set('district', state.district)
      if (state.view !== 'map') params.set('view', state.view)

      if (state.subsystem === 'transport') {
        if (state.mode) params.set('mode', state.mode)
        if (state.route) params.set('route', state.route)
        if (state.fromDistrict) params.set('fromDistrict', state.fromDistrict)
        if (state.toDistrict) params.set('toDistrict', state.toDistrict)
        if (state.focus !== 'overview') params.set('focus', state.focus)
        if (state.pavilionOnly) {
          params.set('pavilion', '1')
          params.set('pavilionOnly', 'true')
        }
        applyMayorTransportParams(params, 'when-missing')
      }

      return toRoute('/mayor-dashboard', params)
    }

    case 'operations': {
      const params = new URLSearchParams()
      if (state.subsystem !== 'heat') params.set('subsystem', state.subsystem)
      if (state.severity) params.set('severity', state.severity)
      if (state.source !== 'all') params.set('source', state.source)
      if (state.utility) params.set('utility', state.utility)
      if (state.outageKind) params.set('outageKind', state.outageKind)
      if (state.district) params.set('district', state.district)
      if (state.selected) params.set('selected', state.selected)
      return toRoute('/operations', params)
    }

    case 'briefing': {
      const params = new URLSearchParams()
      if (state.focus !== 'summary') params.set('focus', state.focus)
      if (state.incident) params.set('incident', state.incident)
      return toRoute('/briefing', params)
    }

    case 'history': {
      const params = new URLSearchParams()
      if (state.period !== '7d') params.set('period', state.period)
      if (state.focus !== 'trend') params.set('focus', state.focus)
      return toRoute('/history', params)
    }

    case 'other':
      return state.route
  }
}

export const buildPageLabel = (state: PresentationPageState): string => {
  switch (state.pageKey) {
    case 'mayor-dashboard':
      return `Панель мэра · ${subsystemLabelById[state.subsystem]}`
    case 'operations':
      return `Операции · ${subsystemLabelById[state.subsystem]}`
    case 'briefing':
      return 'Управленческий отчет'
    case 'history':
      return 'История и аналитика'
    case 'other': {
      const url = parseRoute(state.route)
      if (url.pathname === '/') return 'Главный экран'
      return url.pathname.replace(/^\//, '') || 'Экран'
    }
  }
}

export const getDefaultPresentationState = (pageKey: PresentationPageKey): PresentationPageState => {
  switch (pageKey) {
    case 'mayor-dashboard':
      return {
        pageKey: 'mayor-dashboard',
        subsystem: 'heat',
        district: '',
        view: 'map',
        mode: defaultMayorTransportMode,
        route: defaultMayorTransportRoute,
        fromDistrict: '',
        toDistrict: '',
        focus: 'overview',
        pavilionOnly: false,
      }
    case 'operations':
      return {
        pageKey: 'operations',
        subsystem: 'heat',
        severity: '',
        source: 'all',
        utility: '',
        outageKind: '',
        district: '',
        selected: '',
      }
    case 'briefing':
      return { pageKey: 'briefing', focus: 'summary', incident: '' }
    case 'history':
      return { pageKey: 'history', period: '7d', focus: 'trend' }
    case 'other':
      return { pageKey: 'other', route: '/mayor-dashboard' }
  }
}

export const buildOpenPageCommandFromRoute = (
  route: string,
  label?: string,
): PresentationOpenPageCommand => {
  const page = parseRouteToState(route)
  return {
    type: 'OPEN_PAGE',
    page,
    label: label ?? buildPageLabel(page),
  }
}

export const buildRouteFromPatch = (
  current: PresentationPageState,
  command: PresentationPatchPageStateCommand,
): { state: PresentationPageState; route: string; label: string } => {
  if (current.pageKey !== command.pageKey) {
    const fallback = getDefaultPresentationState(command.pageKey)
    const nextState = { ...fallback, ...command.patch, pageKey: command.pageKey } as PresentationPageState
    return {
      state: nextState,
      route: buildRouteFromState(nextState),
      label: command.label ?? buildPageLabel(nextState),
    }
  }

  const nextState = { ...current, ...command.patch, pageKey: command.pageKey } as PresentationPageState
  return {
    state: nextState,
    route: buildRouteFromState(nextState),
    label: command.label ?? buildPageLabel(nextState),
  }
}

export const getSubsystemPresentationTitle = (subsystem: PresentationSubsystemId): string =>
  subsystemLabelById[subsystem]
