import { useMemo } from 'react'
import type { SigmaState } from '../../store/useSigmaStore'
import { useSigmaStore } from '../../store/useSigmaStore'
import type { LiveIncidentView } from '../types'
import {
  selectDistrictOutageCards,
  selectIncidentViewList,
  selectOutageHistorySeries,
} from '../selectors/pure'

export const useIncidentViews = (): LiveIncidentView[] => {
  const incidents = useSigmaStore((state) => state.incidents)
  const live = useSigmaStore((state) => state.live)
  return useMemo(
    () => selectIncidentViewList({ incidents, live } as SigmaState),
    [incidents, live],
  )
}

export const useDistrictOutageCards = () => {
  const live = useSigmaStore((state) => state.live)
  return useMemo(
    () => selectDistrictOutageCards({ live } as SigmaState),
    [live],
  )
}

export const useOutageHistorySeries = () => {
  const live = useSigmaStore((state) => state.live)
  return useMemo(
    () => selectOutageHistorySeries({ live } as SigmaState),
    [live],
  )
}
