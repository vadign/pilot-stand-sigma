import type { TransportRealtimeAvailability } from '../types'

export class TransportRealtimeProvider {
  getAvailability(): TransportRealtimeAvailability {
    return {
      available: true,
      message: 'Реальные позиции транспорта подтягиваются через backend-proxy `/api/routes` и `/api/vehicles?routeId=...` к maps.nskgortrans.ru.',
    }
  }
}
