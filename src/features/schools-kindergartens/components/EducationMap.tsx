import { useEffect, useMemo, useState } from 'react'
import { Circle, Clusterer, Map, Placemark, YMaps } from '@pbe/react-yandex-maps'
import type { EducationInstitution } from '../types'
import {
  defaultEducationMapState,
  formatEducationPlacemarkLabel,
  getEducationMapState,
  selectVisibleEducationLabelIds,
  type GeocodedEducationInstitution,
} from '../mapPresentation'
import { getModerateClusterZoom } from '../../../lib/mapClusterZoom'

const markerColorByKind = {
  school: '#2563eb',
  kindergarten: '#f97316',
} as const

const fillColorByKind = {
  school: 'rgba(37, 99, 235, 0.10)',
  kindergarten: 'rgba(249, 115, 22, 0.12)',
} as const

const coverageRadiusMetersByKind = {
  school: 900,
  kindergarten: 500,
} as const

const clustererOptions = {
  groupByCoordinates: false,
  gridSize: 120,
  clusterDisableClickZoom: true,
  clusterOpenBalloonOnClick: false,
  preset: 'islands#invertedBlueClusterIcons',
}

const mapOptions = {
  suppressMapOpenBlock: true,
  minZoom: 9,
}

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const createInstitutionBalloonBody = (institution: EducationInstitution): string =>
  [
    `<div><b>Тип:</b> ${institution.kind === 'school' ? 'Школа' : 'Детский сад'}</div>`,
    `<div><b>Район:</b> ${escapeHtml(institution.district)}</div>`,
    `<div><b>Адрес:</b> ${escapeHtml(institution.address)}</div>`,
    institution.phone ? `<div><b>Телефон:</b> ${escapeHtml(institution.phone)}</div>` : '',
    institution.capacity ? `<div><b>Вместимость:</b> ${institution.capacity}</div>` : '',
  ].filter(Boolean).join('')

export function EducationMap({
  institutions,
  showCoverage,
  selectedInstitutionId,
  onSelectInstitution,
}: {
  institutions: GeocodedEducationInstitution[]
  showCoverage: boolean
  selectedInstitutionId?: string | null
  onSelectInstitution: (institutionId: string | null) => void
}) {
  const [mapState, setMapState] = useState<{ center: [number, number]; zoom: number }>(defaultEducationMapState)

  useEffect(() => {
    setMapState(getEducationMapState(institutions))
  }, [institutions])

  const visibleLabelIds = useMemo(
    () => selectVisibleEducationLabelIds(institutions, mapState.zoom, selectedInstitutionId),
    [institutions, mapState.zoom, selectedInstitutionId],
  )

  const coverageInstitutions = useMemo(() => {
    if (!showCoverage || mapState.zoom < 12) return []

    return institutions.filter((institution) =>
      visibleLabelIds.has(institution.id) || institution.id === selectedInstitutionId,
    )
  }, [institutions, mapState.zoom, selectedInstitutionId, showCoverage, visibleLabelIds])

  const handleClusterClick = (event: { get: (key: string) => unknown }) => {
    const rawCoords = event.get('coords')
    const target = event.get('target') as { geometry?: { getCoordinates?: () => unknown } } | undefined
    const targetCoords = target?.geometry?.getCoordinates?.()
    const nextCenter = Array.isArray(rawCoords)
      ? [Number(rawCoords[0]), Number(rawCoords[1])] as [number, number]
      : Array.isArray(targetCoords)
        ? [Number(targetCoords[0]), Number(targetCoords[1])] as [number, number]
        : mapState.center

    setMapState((current) => ({
      center: nextCenter,
      zoom: getModerateClusterZoom(current.zoom),
    }))
  }

  return (
    <div className="h-[460px] overflow-hidden rounded-2xl border border-slate-200">
      <YMaps query={{ lang: 'ru_RU' }}>
        <Map
          state={mapState}
          width="100%"
          height="100%"
          options={mapOptions}
          onBoundsChange={(event: { get: (key: string) => [number, number] | number | undefined }) => {
            const nextCenter = event.get('newCenter')
            const nextZoom = event.get('newZoom')

            setMapState((current) => ({
              center: Array.isArray(nextCenter) ? [Number(nextCenter[0]), Number(nextCenter[1])] : current.center,
              zoom: typeof nextZoom === 'number' ? nextZoom : current.zoom,
            }))
          }}
        >
          {coverageInstitutions.map((institution) => (
            <Circle
              key={`coverage-${institution.id}`}
              geometry={[institution.coordinates, coverageRadiusMetersByKind[institution.kind]]}
              options={{
                fillColor: fillColorByKind[institution.kind],
                strokeColor: markerColorByKind[institution.kind],
                strokeOpacity: institution.id === selectedInstitutionId ? 0.45 : 0.2,
                strokeWidth: institution.id === selectedInstitutionId ? 2 : 1,
              }}
            />
          ))}

          <Clusterer options={clustererOptions} onClick={handleClusterClick}>
            {institutions.map((institution) => {
              const isActive = institution.id === selectedInstitutionId
              const showLabel = visibleLabelIds.has(institution.id)

              return (
                <Placemark
                  key={institution.id}
                  geometry={institution.coordinates}
                  properties={{
                    balloonContentHeader: escapeHtml(institution.name),
                    balloonContentBody: createInstitutionBalloonBody(institution),
                    hintContent: escapeHtml(institution.name),
                    iconCaption: showLabel ? escapeHtml(formatEducationPlacemarkLabel(institution)) : '',
                  }}
                  options={{
                    preset: isActive ? 'islands#circleIcon' : 'islands#circleDotIcon',
                    iconColor: markerColorByKind[institution.kind],
                    zIndex: isActive ? 2500 : 1200,
                    hideIconOnBalloonOpen: false,
                    openBalloonOnClick: false,
                  }}
                  modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                  onClick={() => onSelectInstitution(institution.id)}
                />
              )
            })}
          </Clusterer>
        </Map>
      </YMaps>
    </div>
  )
}
