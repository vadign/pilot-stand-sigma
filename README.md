# Sigma — frontend-only demo с расширенными источниками данных

Sigma остается существующим frontend-приложением на React/Vite/TypeScript/Tailwind/Zustand. Архитектура не переписана: новые источники встроены в текущий live ingestion/adapter слой, store, Ask Sigma, карту и существующие экраны.

## Что добавлено

### Новые направления
- ЖКХ / отключения.
- Экология и погодные риски.
- Транспорт и calculated traffic index.
- Дорожная безопасность / камеры ПДД.
- Медицинская инфраструктура.
- Строительство и градконтроль.
- Социальная инфраструктура: школы, детсады, библиотеки, аптеки, спорт, культура, парковки.
- Геопространственный интеллект: полигоны районов и spatial enrichment.
- Управление источниками данных через отдельный экран `/sources`.

### Новые источники и типы данных
- **real**: 051, Open-Meteo, OpenData construction.
- **reference**: OSM Overpass, OpenData directories, районные полигоны.
- **calculated**: traffic index, ecology risk cards, active construction diff.
- **mock fallback**: только когда live/snapshot/cache недоступны.

## Data architecture

Используются четыре слоя:
1. **Raw source layer** — HTML/CSV/JSON/Overpass snapshots, TTL, parse version, error state.
2. **Normalized source layer** — приведение к `SigmaEvent`, `SigmaIndicator`, `SigmaReferenceObject`, `SigmaSourceStatus` и связанным типам.
3. **Derived domain layer** — ecology risk rules, traffic index, active construction, district classification, source freshness.
4. **UI/query layer** — экраны, карта, Ask Sigma, фильтры, история, сценарии.

## Source registry и TTL

- 051 — 30 минут.
- OpenData topics — 24 часа.
- Open-Meteo weather/air — 15 минут.
- CityAir — 15 минут, только если задан API key.
- OSM Overpass cameras — 7 дней.
- OSM Overpass medical — 72 часа.
- OSM boundaries — long-lived static/manual cache.
- traffic index — runtime calculated.

Fallback order не менялся:
1. runtime,
2. snapshot,
3. cache,
4. mock.

## Ask Sigma: новые запросы

Поддерживаются, например:
- `отключения сейчас`
- `качество воздуха в городе`
- `риски для жизни в городе`
- `индекс дорожной нагрузки`
- `как проехать из советского района в центральный`
- `камеры в ленинском районе`
- `больницы в районе`
- `активные стройки`
- `школы в советском районе`
- `покажи live-источники`

Pipeline сохранен:
`normalize -> special query handler -> router -> planner -> executor -> renderer`

## Запуск

```bash
npm install
npm run dev
```

Проверки:

```bash
npm test
npm run build
```

## Как локально проверить новые направления

### 1. Источники данных
- Откройте `/sources`.
- Проверьте статус, TTL, тип данных, row/object count, origin и last update.

### 2. Экология
- Откройте `/briefing`, `/mayor-dashboard`, `/history`.
- Проверьте AQI, PM2.5, temperature и risk cards.
- В Ask Sigma спросите: `качество воздуха в городе`, `риски для жизни в городе`.

### 3. Транспорт
- Откройте `/operations` и включите слои `stops` и `districts`.
- Проверьте карточки и banners с `traffic index (calculated)`.
- В Ask Sigma спросите: `индекс дорожной нагрузки`, `как проехать из советского района в центральный`.

### 4. Камеры ПДД и медицина
- Откройте `/operations`, включите `cameras` и `medical`.
- Убедитесь, что объекты отображаются только как reference layer.
- В Ask Sigma спросите: `камеры в ленинском районе`, `больницы в районе`.

### 5. Строительство
- Откройте `/briefing`, `/history`, карточку инцидента.
- Проверьте active construction и районные агрегаты.
- В Ask Sigma спросите: `активные стройки`, `стройки по районам`.

### 6. Социальная инфраструктура
- Откройте `/operations` и `/sources`.
- В Ask Sigma спросите: `школы в советском районе`, `библиотеки`, `аптеки`.

## Документация

- `docs/live-sources.md` — старый live контур и базовые принципы.
- `docs/sources-and-directions.md` — новый каталог источников, TTL, лицензий, направлений и правил расширения.
