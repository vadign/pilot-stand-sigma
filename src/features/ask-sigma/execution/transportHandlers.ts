import {
  getTransportDistrictLabel,
  selectCurrentFareCards,
  selectDistrictConnectivity,
  selectFilteredStops,
  selectGlobalTransportMetrics,
  selectRouteDetails,
  selectSelectedDistrictSummary,
  selectStopsForRoute,
} from '../../public-transport/selectors'
import type { AskSigmaOperation } from '../types'
import { buildPublicTransportLink, detectRouteFromText, detectTransportDistrictFilters, detectTransportMode, formatTransportDistrictLabel } from '../transportQuery'
import type { AskSigmaExecutionHandler } from './context'
import { getTransportData, toTransportDistrictTitle } from './shared'

export const transportOperationHandlers: Partial<Record<AskSigmaOperation, AskSigmaExecutionHandler>> = {
  PUBLIC_TRANSPORT_SUMMARY: ({ context, provider }) => {
    const { stops, fares, statuses, fallbackMode } = getTransportData(provider)
    const metrics = selectGlobalTransportMetrics(stops, fares)
    const refreshedAt = statuses.find((status) => status.updatedAt)?.updatedAt ?? stops[0]?.updatedAt ?? context.now
    const dataType = statuses.some((status) => status.dataType === 'real') ? 'real' : 'mock-fallback'

    return {
      type: 'PUBLIC_TRANSPORT_SUMMARY',
      title: 'Общественный транспорт',
      summary: fallbackMode
        ? 'Показываю последний сохраненный снимок. Данные по общественному транспорту сейчас недоступны в режиме прямого обновления.'
        : `Остановок: ${metrics.totalStops}, районов покрытия: ${metrics.districtCount}, уникальных маршрутов: ${metrics.totalUniqueRoutes}, доля павильонов: ${(metrics.pavilionShare * 100).toFixed(1)}%.`,
      kpis: [
        { label: 'Остановки', value: String(metrics.totalStops) },
        { label: 'Районы покрытия', value: String(metrics.districtCount) },
        { label: 'Маршруты', value: String(metrics.totalUniqueRoutes) },
        { label: 'Павильоны', value: `${(metrics.pavilionShare * 100).toFixed(1)}%` },
      ],
      actions: [
        { label: 'Открыть вкладку транспорта', route: buildPublicTransportLink() },
        { label: 'Показать на карте', route: buildPublicTransportLink({ focus: 'map' }) },
      ],
      explain: { source: 'opendata.novo-sibirsk.ru, наборы данных 49/51', updatedAt: refreshedAt, dataType },
    }
  },

  TRANSIT_STOPS: ({ context, options, plan, provider }) => {
    const { stops } = getTransportData(provider)
    const explicitDistrict = detectTransportDistrictFilters(plan.text)[0]
    const implicitDistrict = options?.implicitDistrict
    const districtFilter =
      explicitDistrict?.district ?? (String(plan.filters?.districtLabel ?? '') || implicitDistrict || '')
    const withPavilion = Boolean(plan.filters?.pavilionOnly)
    const filtered = selectFilteredStops(stops, {
      district: districtFilter,
      mode: 'all',
      search: '',
      route: '',
      onlyPavilion: withPavilion,
    })
    const topStops = filtered.slice(0, 8)
    const isCountMetric = String(plan.filters?.metric ?? '') === 'count'
    const appliedDistrictFilter = districtFilter
      ? {
          district: explicitDistrict ? formatTransportDistrictLabel(explicitDistrict) : districtFilter,
          rawLabel: explicitDistrict?.rawLabel,
          source: explicitDistrict ? ('explicit' as const) : ('implicit' as const),
        }
      : undefined

    return {
      type: 'TRANSIT_STOPS',
      title: districtFilter ? `Остановки: ${toTransportDistrictTitle(districtFilter)}` : 'Остановки общественного транспорта',
      summary: isCountMetric
        ? `В ${districtFilter ? toTransportDistrictTitle(districtFilter) : 'городе'} найдено ${filtered.length} остановок${withPavilion ? ' с павильоном' : ''}.`
        : districtFilter
          ? `Найдено ${filtered.length} остановок ${withPavilion ? 'с павильоном ' : ''}в районе ${toTransportDistrictTitle(districtFilter)}.`
          : `Найдено ${filtered.length} остановок по заданному фильтру.`,
      transportStops: topStops,
      appliedDistrictFilter,
      actions: [
        {
          label: 'На карте',
          route: buildPublicTransportLink({
            district: districtFilter || undefined,
            pavilionOnly: withPavilion,
            focus: 'map',
          }),
        },
        {
          label: 'Открыть транспорт',
          route: buildPublicTransportLink({
            district: districtFilter || undefined,
            pavilionOnly: withPavilion,
          }),
        },
      ],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 49',
        updatedAt: stops[0]?.updatedAt ?? context.now,
        dataType: 'mock-fallback',
      },
    }
  },

  TRANSIT_ROUTE_LOOKUP: ({ context, plan, provider }) => {
    const { stops } = getTransportData(provider)
    const routeNumber = String(plan.filters?.route ?? '') || detectRouteFromText(plan.text)
    const district = String(plan.filters?.district ?? '')
    const scopedStops = district
      ? selectFilteredStops(stops, { district, mode: 'all', search: '', route: '', onlyPavilion: false })
      : stops
    const route = routeNumber ? selectRouteDetails(scopedStops, routeNumber) : undefined
    const routeStops = routeNumber ? selectStopsForRoute(scopedStops, routeNumber).slice(0, 8) : []

    return {
      type: 'TRANSIT_ROUTE_LOOKUP',
      title: routeNumber ? `Маршрут ${routeNumber}` : 'Маршруты общественного транспорта',
      summary: route
        ? `Маршрут встречается на ${route.stopCount} остановках в ${route.districtCount} районах.`
        : district
          ? `В районе ${toTransportDistrictTitle(district)} найдено ${new Set(scopedStops.flatMap((stop) => stop.routesParsed.map((item) => item.number))).size} маршрутов.`
          : 'Уточните номер маршрута или район для подбора маршрутов.',
      transportStops: routeStops.length > 0 ? routeStops : scopedStops.slice(0, 8),
      transportRoute: route
        ? { route: route.routeId, stopCount: route.stopCount, districts: route.districts.map(getTransportDistrictLabel) }
        : undefined,
      actions: [
        {
          label: 'Показать маршрутные остановки',
          route: buildPublicTransportLink({
            route: routeNumber || undefined,
            district: district || undefined,
            focus: 'list',
          }),
        },
        {
          label: 'Открыть на карте',
          route: buildPublicTransportLink({
            route: routeNumber || undefined,
            district: district || undefined,
            focus: 'map',
          }),
        },
      ],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 49',
        updatedAt: stops[0]?.updatedAt ?? context.now,
        dataType: 'mock-fallback',
      },
    }
  },

  TRANSIT_HUBS: ({ context, provider }) => {
    const { stops, fares } = getTransportData(provider)
    const metrics = selectGlobalTransportMetrics(stops, fares)
    const hubs = metrics.topStopsByRouteCount.slice(0, 5)
    return {
      type: 'TRANSIT_HUBS',
      title: 'Остановки с наибольшим числом маршрутов',
      summary: `Показываю остановки с наибольшим числом маршрутов: ${hubs.slice(0, 3).map((stop) => `${stop.name} (${stop.routesParsed.length})`).join(' · ')}.`,
      transportStops: hubs,
      transportHubs: hubs.map((stop) => ({ name: stop.name, district: stop.district, routes: stop.routesParsed.length })),
      actions: [{ label: 'Открыть транспорт', route: buildPublicTransportLink({ focus: 'hubs' }) }],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 49',
        updatedAt: stops[0]?.updatedAt ?? context.now,
        dataType: 'calculated',
      },
    }
  },

  TRANSIT_ROUTE_BETWEEN_DISTRICTS: ({ context, plan, provider }) => {
    const { stops } = getTransportData(provider)
    const fromDistrict = String(plan.filters?.fromDistrict ?? '')
    const toDistrict = String(plan.filters?.toDistrict ?? '')
    const compare = selectDistrictConnectivity(stops, fromDistrict, toDistrict)
    return {
      type: 'TRANSIT_ROUTE_BETWEEN_DISTRICTS',
      title: 'Маршруты между районами',
      summary: fromDistrict && toDistrict
        ? `Между ${toTransportDistrictTitle(fromDistrict)} и ${toTransportDistrictTitle(toDistrict)} найдено ${compare.count} общих маршрутов.`
        : 'Уточните районы отправления и назначения.',
      transportRouteBetweenDistricts: fromDistrict && toDistrict
        ? {
            from: toTransportDistrictTitle(fromDistrict),
            to: toTransportDistrictTitle(toDistrict),
            commonRoutes: compare.commonRoutes,
            count: compare.count,
            examplesFrom: compare.examplesA.map((item) => item.name),
            examplesTo: compare.examplesB.map((item) => item.name),
            note: 'Это пересечение маршрутов по остановкам, а не точный маршрут от двери до двери.',
          }
        : undefined,
      actions: [
        { label: 'Открыть транспорт', route: buildPublicTransportLink({ fromDistrict, toDistrict }) },
        { label: 'Показать на карте', route: buildPublicTransportLink({ fromDistrict, toDistrict, focus: 'map' }) },
      ],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 49',
        updatedAt: stops[0]?.updatedAt ?? context.now,
        dataType: 'calculated',
      },
    }
  },

  TRANSIT_DISTRICT_COMPARE: ({ context, plan, provider }) => {
    const { stops } = getTransportData(provider)
    const from = detectTransportDistrictFilters(plan.text)[0]?.district ?? ''
    const to = detectTransportDistrictFilters(plan.text)[1]?.district ?? ''
    const connectivity = selectDistrictConnectivity(stops, from, to)
    const fromSummary = selectSelectedDistrictSummary(stops, from)
    const toSummary = selectSelectedDistrictSummary(stops, to)
    return {
      type: 'TRANSIT_DISTRICT_COMPARE',
      title: 'Сравнение районов по транспорту',
      summary: from && to
        ? `${toTransportDistrictTitle(from)}: остановок ${fromSummary?.stopCount ?? 0}, маршрутов ${fromSummary?.uniqueRoutes ?? 0}. ${toTransportDistrictTitle(to)}: остановок ${toSummary?.stopCount ?? 0}, маршрутов ${toSummary?.uniqueRoutes ?? 0}.`
        : 'Уточните два района для сравнения транспортного покрытия.',
      districtCompare: from && to
        ? {
            from: toTransportDistrictTitle(from),
            to: toTransportDistrictTitle(to),
            commonRoutes: connectivity.commonRoutes,
            count: connectivity.count,
          }
        : undefined,
      actions: [{ label: 'Открыть транспорт', route: buildPublicTransportLink({ fromDistrict: from || undefined, toDistrict: to || undefined }) }],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 49',
        updatedAt: stops[0]?.updatedAt ?? context.now,
        dataType: 'calculated',
      },
    }
  },

  TRANSIT_FARES: ({ context, plan, provider }) => {
    const { fares } = getTransportData(provider)
    const mode = String(plan.filters?.mode ?? '') || detectTransportMode(plan.text)
    const cards = selectCurrentFareCards(fares)
      .filter((fare) => !mode || fare.mode === mode || (mode === 'bus' && fare.mode === 'unknown'))
      .slice(0, 8)
    return {
      type: 'TRANSIT_FARES',
      title: 'Тарифы общественного транспорта',
      summary: cards.map((fare) => `${fare.fareType}: ${fare.amount} ₽`).join(' · '),
      transportFares: cards,
      actions: [
        { label: 'Показать тарифы', route: buildPublicTransportLink({ mode: mode || undefined, focus: 'fares' }) },
        { label: 'Открыть транспорт', route: buildPublicTransportLink({ mode: mode || undefined }) },
      ],
      explain: {
        source: 'opendata.novo-sibirsk.ru, набор данных 51',
        updatedAt: fares[0]?.updatedAt ?? context.now,
        dataType: 'mock-fallback',
      },
    }
  },

  TRANSIT_NAVIGATE_TO_PAGE: ({ explainBase, plan }) => ({
    type: 'TRANSIT_NAVIGATE_TO_PAGE',
    title: 'Открываю вкладку общественного транспорта',
    summary: 'Передаю фильтры в транспортный модуль.',
    actions: [{
      label: 'Открыть транспорт',
      route: buildPublicTransportLink({
        district: String(plan.filters?.district ?? '') || undefined,
        fromDistrict: String(plan.filters?.fromDistrict ?? '') || undefined,
        toDistrict: String(plan.filters?.toDistrict ?? '') || undefined,
        route: String(plan.filters?.route ?? '') || undefined,
        mode: String(plan.filters?.mode ?? '') || undefined,
        pavilionOnly: Boolean(plan.filters?.pavilionOnly),
        focus: String(plan.filters?.focus ?? '') || undefined,
      }),
    }],
    explain: { ...explainBase, dataType: 'calculated' },
  }),
}
