# Sources and directions in Sigma

## Основной принцип

Новые источники подключаются только через единый ingestion/adapter слой и делятся на:
- raw;
- normalized;
- derived;
- UI/query.

## Источники

| Source id | Название | Kind | TTL | License | Category | Directions |
|---|---|---:|---:|---|---|---|
| `source-051` | 051 — отключения ЖКХ | html | 30m | Официальный городской HTML-интерфейс | real | utilities, city-services |
| `source-openmeteo-air` | Open-Meteo — качество воздуха | api | 15m | Open-Meteo / CC BY 4.0 | real | ecology |
| `source-openmeteo-weather` | Open-Meteo — погода | api | 15m | Open-Meteo / CC BY 4.0 | real | ecology, roads |
| `source-cityair` | CityAir API | api | 15m | API key / deployment-specific | real | ecology |
| `source-overpass-cameras` | OSM Overpass — камеры ПДД | overpass | 7d | OSM ODbL | reference | safety, roads |
| `source-overpass-medical` | OSM Overpass — медучреждения | overpass | 72h | OSM ODbL | reference | medical, social |
| `source-opendata-stops` | OpenData — остановки | csv | 24h | OpenData Novosibirsk | reference | transport, roads |
| `source-opendata-schools` | OpenData — школы | csv | 24h | OpenData Novosibirsk | reference | education, social |
| `source-opendata-kindergartens` | OpenData — детские сады | csv | 24h | OpenData Novosibirsk | reference | education, social |
| `source-opendata-libraries` | OpenData — библиотеки | csv | 24h | OpenData Novosibirsk | reference | culture, social |
| `source-opendata-pharmacies` | OpenData — аптеки | csv | 24h | OpenData Novosibirsk | reference | medical, social |
| `source-opendata-sport-grounds` | OpenData — спортплощадки | csv | 24h | OpenData Novosibirsk | reference | sport, social |
| `source-opendata-sport-orgs` | OpenData — спортивные организации | csv | 24h | OpenData Novosibirsk | reference | sport, social |
| `source-opendata-culture` | OpenData — культура | csv | 24h | OpenData Novosibirsk | reference | culture, social |
| `source-opendata-parking` | OpenData — парковки | csv | 24h | OpenData Novosibirsk | reference | transport, city-services |
| `source-opendata-construction-permits` | OpenData — разрешения | csv | 24h | OpenData Novosibirsk | real | construction |
| `source-opendata-construction-commissioned` | OpenData — ввод | csv | 24h | OpenData Novosibirsk | real | construction |
| `source-osm-boundaries` | OSM — границы районов | static | long-lived | OSM ODbL | reference | city-services |
| `source-traffic-index` | Sigma — traffic index | derived | 15m | Sigma calculated | calculated | transport, roads |

## Что факт, а что расчет

### Facts / real
- отключения 051;
- погодные и air-quality индикаторы Open-Meteo;
- строительные реестры OpenData.

### Reference
- камеры ПДД;
- медучреждения;
- stops и directory layers;
- границы районов.

### Calculated
- `traffic_index`;
- `activeConstruction = permits - commissioned` по `KadNom`;
- ecology risk cards по rules;
- transit district connectivity.

### Simulation
- сценарии и digital deputies остаются отдельным слоем и не смешиваются с фактами.

## Правила честности UI

- traffic index всегда помечается как `calculated`.
- камеры и медучреждения не превращаются в fake incidents.
- если spatial matching выполнен по fallback centroid, качество должно быть понижено.
- source badges, freshness и data category должны быть видны в UI и Ask Sigma.

## Как добавить новый источник

1. Добавить запись в `src/live/config/sourceRegistry.ts`.
2. Добавить parser/provider в `src/live/parsers/*` и `src/live/providers/*`.
3. Привести данные к `SigmaIndicator`, `SigmaReferenceObject`, `SigmaEvent` или related types.
4. Добавить derived rules/selectors, если источник участвует в аналитике.
5. Подключить данные к Ask Sigma и к одному из существующих экранов.
6. Добавить fixture-based tests без live network.

## Как добавить новое направление

1. Расширить `SigmaDomainDirection`.
2. Добавить source-to-direction mapping в source registry.
3. Добавить typed result renderer для Ask Sigma.
4. Встроить направление в существующие страницы через карточки, tabs, filters или contextual blocks.
5. Обновить `/sources` и документацию.
