import type { TransportRealtimeAvailability } from '../types'

export class TransportRealtimeProvider {
  getAvailability(): TransportRealtimeAvailability {
    return {
      available: false,
      message: 'Реальное положение транспорта не подключено: в проекте нет официального GTFS-RT/partner feed',
    }
  }
}
