import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  readConnectivityFromParams,
  readFiltersFromParams,
  type TransportConnectivityValue,
  writeFiltersToParams,
} from '../queryState'

export const useTransportQueryState = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readFiltersFromParams(searchParams, true), [searchParams])
  const connectivity = useMemo<TransportConnectivityValue>(
    () => readConnectivityFromParams(searchParams),
    [searchParams],
  )

  const updateFilters = (next: typeof filters) => {
    setSearchParams(writeFiltersToParams(next, searchParams), { replace: true })
  }

  const updateConnectivity = (key: keyof TransportConnectivityValue, value: string) => {
    const params = new URLSearchParams(searchParams)
    const paramKey = key === 'from' ? 'fromDistrict' : 'toDistrict'
    if (value) params.set(paramKey, value)
    else params.delete(paramKey)
    setSearchParams(params, { replace: true })
  }

  return {
    searchParams,
    setSearchParams,
    filters,
    updateFilters,
    connectivity,
    updateConnectivity,
  }
}
