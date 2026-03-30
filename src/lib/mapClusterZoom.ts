export const getModerateClusterZoom = (currentZoom: number, maxZoom = 15): number =>
  Math.min(currentZoom + 2, maxZoom)
