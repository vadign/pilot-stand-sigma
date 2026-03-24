export const defaultMayorTransportMode = 'minibus'
export const defaultMayorTransportRoute = '35'
export const defaultMayorTransportPath = `/mayor-dashboard?subsystem=transport&mode=${defaultMayorTransportMode}&route=${defaultMayorTransportRoute}`

export const applyMayorTransportParams = (
  params: URLSearchParams,
  strategy: 'always' | 'when-missing' = 'when-missing',
): URLSearchParams => {
  params.set('subsystem', 'transport')

  if (strategy === 'always' || (!params.get('mode') && !params.get('route'))) {
    params.set('mode', defaultMayorTransportMode)
    params.set('route', defaultMayorTransportRoute)
  }

  return params
}
