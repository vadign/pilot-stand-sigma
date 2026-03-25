# Sigma — frontend-only demo

Sigma остается frontend-only приложением на React + Vite + TypeScript. В этой версии добавлен двухконтурный ingestion для официальных источников Новосибирска без runtime-backend:

- **051** — отключения ЖКХ: `https://051.novo-sibirsk.ru/SitePages/off.aspx`
- **OpenData Novosibirsk** — строительные наборы 124/125: `https://opendata.novo-sibirsk.ru`
- **OpenData Novosibirsk** — транспортные наборы 49/51: остановки наземного транспорта и тарифы на проезд.

## Что теперь умеет приложение

### Режимы данных
Через env доступны три режима:

- `mock` — только текущие моки.
- `hybrid` — реальные данные там, где они доступны, и mock fallback в остальном. **Режим по умолчанию.**
- `live` — приоритет на прямое получение данных; если оно недоступно, UI честно падает в snapshot/cache/mock fallback.

### Порядок источников
Для контуров с актуальными данными используется одинаковый приоритет:

1. runtime fetch из браузера,
2. локальный snapshot (`public/live-data/*`),
3. IndexedDB cache,
4. mock fallback.

### Где данные уже интегрированы
- `/mayor-dashboard` — KPI по отключениям, карта проблем, топ районов, статус ЖКХ.
- `/briefing` — ежедневный отчет по 051 + строительная активность по районам.
- `/operations` — лента 051 с фильтрами `запланированные/экстренные`, `utility`, `district`, `source`.
- `/incidents/:id` — карточка инцидента 051 с районным уровнем детализации и локальным workflow поверх источника 051.
- `/history` — тренд по накопленным snapshot 051 и строительная аналитика по open data.
- `/deputies` — показатели для ЖКХ/теплоснабжения.
- `/regulations` — связи `utilityType/outageType -> регламент`, `active construction -> контроль`.
- `/public-transport` — карта Яндекса со слоем остановок, фильтрами, метриками, тарифами, карточками остановок и блоком «Связность районов».
- Ask Sigma — вопросы по отключениям, стройке, freshness, статусам источников и общественному транспорту.

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` теперь:
- делает стартовую синхронизацию snapshots;
- поднимает Vite;
- повторяет `sync:live` автоматически раз в час.

Если нужен только UI без фонового обновления snapshots, используйте:

```bash
npm run dev:vite
```

Сборка не требует сети, если snapshots уже лежат в `public/live-data`:

```bash
npm run build
```

## Env-конфигурация

Смотрите `.env.example`.

```env
VITE_SOURCE_MODE=hybrid
VITE_ENABLE_RUNTIME_LIVE_FETCH=true
VITE_051_URL=https://051.novo-sibirsk.ru/SitePages/off.aspx
VITE_OPENDATA_BASE_URL=https://opendata.novo-sibirsk.ru
VITE_051_PROXY_URL=
VITE_OPENDATA_PROXY_URL=
```

### Поведение env
- `VITE_ENABLE_RUNTIME_LIVE_FETCH=false` — только snapshot + cache + mock.
- если `true`, клиент сначала пробует runtime-refresh;
- если прямой fetch не проходит из-за CORS/timeout/parser error, приложение откатывается на snapshot/cache/mock и показывает это в UI.

## Синхронизация snapshots

### `npm run sync:051`
- загружает `off.aspx`;
- сохраняет raw HTML snapshot;
- парсит блоки `запланированные/экстренные`;
- нормализует в JSON;
- обновляет `public/live-data/051/latest.json`;
- добавляет запись в `public/live-data/051/history/index.json` и timestamp-файл.

### `npm run sync:opendata`
- загружает паспорта и CSV для dataset `124` и `125`;
- сохраняет raw HTML/CSV;
- строит `construction-permits.json`, `construction-commissioned.json`, `construction-active.json`, `construction-bundle.json`.

> Транспортный модуль использует тот же frontend-паттерн `runtime -> snapshot -> cache -> mock`, но в этом коммите реализован без отдельного sync-скрипта: провайдеры dataset 49/51 готовы к прямому fetch, чтению локальных snapshots (`/live-data/opendata/transport-stops.json`, `/live-data/opendata/transport-fares.json`) и IndexedDB cache.

### `npm run sync:live`
Запускает обе синхронизации и пересобирает `public/live-data/manifest.json`.

### `npm run sync:live:hourly`
Запускает стартовую синхронизацию, затем повторяет `sync:live` раз в час в фоновом long-running процессе.

Интервал можно переопределить так: `SIGMA_SNAPSHOT_SYNC_INTERVAL_MS=1800000 npm run dev`.
По умолчанию используется `3600000` миллисекунд, то есть 1 час.

> В sandbox этого задания внешние сайты были недоступны, поэтому sync-скрипты автоматически откатились на fixture snapshots. В обычной среде с доступом к доменам они используют реальные официальные источники.

## Структура модуля источников

```text
scripts/
  dev.mts
  sync-051.mts
  sync-opendata.mts
  sync-live.mts
src/live/
  config/
  hooks/
  normalizers/
  parsers/
  providers/
  selectors/
  storage/
  tests/
public/live-data/
  manifest.json
  051/
  opendata/
```

## Где лежат snapshots

- `public/live-data/manifest.json`
- `public/live-data/051/latest.json`
- `public/live-data/051/history/index.json`
- `public/live-data/opendata/construction-permits.json`
- `public/live-data/opendata/construction-commissioned.json`
- `public/live-data/opendata/construction-active.json`
- `public/live-data/opendata/construction-bundle.json`

## Общественный транспорт: источники и ограничения

### Route
- `/public-transport`

### Источники
- **Dataset 49** — остановки наземного городского пассажирского транспорта. Используются поля `OstName`, `AdrDistr`, `AdrStreet`, `Pavilion`, `Marshryt` и координаты, если они присутствуют в CSV.
- **Dataset 51** — тарифы на проезд в городском пассажирском транспорте. Парсер нормализует вид транспорта, тип тарифа, стоимость, дату/условие действия и перевозчика, если поле выделяется из CSV.

### Что считается на вкладке
Из открытых данных и поля `Marshryt` вычисляются:
- `totalStops`;
- `districtStopCounts`;
- `districtCount`;
- `totalUniqueRoutes`;
- `routesByMode`;
- `pavilionShare`;
- `topStopsByRouteCount`;
- `topDistrictsByStopCount`;
- `topDistrictsByUniqueRoutes`;
- `routeCoverageByDistrict`;
- `selectedDistrictSummary`;
- `currentFareCards`;
- `transportInfrastructureIndex` — помечен как `calculated`, а не внешний официальный KPI.

### Честные ограничения данных
- Вкладка **не рисует транспорт в движении в реальном времени** и **не показывает ETA**, потому что в проекте нет официального GTFS-RT/partner feed.
- Если для остановки нет координат, она остаётся в списке и метриках, но не попадает в слой маркеров на карте.
- Если runtime fetch dataset 49/51 не удался, UI откатывается на snapshot/cache/mock-fallback и явно показывает это в source badges.
- Выбор маршрута без официальной геометрии лишь подсвечивает остановки, где этот номер найден в `Marshryt`; полилинии не рисуются.

### Как добавить новый транспортный dataset
1. Добавьте parser/normalizer в `src/features/public-transport/parsers/*`.
2. Создайте provider по шаблону `NovosibirskStopsProvider` / `NovosibirskTariffsProvider`.
3. Подключите snapshot/cache/runtime fallback.
4. Протяните derived selectors и source badges в UI.
5. При наличии официального realtime feed реализуйте `TransportRealtimeProvider`, не смешивая real и simulation без маркировки.

## Как добавить новый dataset из OpenData

1. Добавьте описание в `src/live/config/opendataDatasets.ts`.
2. Расширьте parser/normalizer под новую схему CSV.
3. Добавьте snapshot запись в `scripts/sync-opendata.mts`.
4. Добавьте selector/UI consumption.
5. Зафиксируйте fallback/meta block: источник, обновление, TTL, тип данных.

## Поведение при недоступности прямых данных

Sigma **не подменяет реальность симуляцией**.

- если 051 доступен только на районном уровне — карта и карточка показывают именно уровень района;
- если OpenData не дал координаты — они не придумываются;
- если нет официального realtime feed по транспорту — на карте нет движущихся автобусов и ETA;
- если данные старые — возраст виден в мета-блоке;
- если runtime fetch не удался — Ask Sigma и UI пишут, что показан snapshot/cache/mock fallback.

## Ask Sigma: поддерживаемые запросы

- `отключения сейчас`
- `экстренные отключения`
- `запланированные отключения`
- `отключения по районам`
- `отключения отопления`
- `где больше всего отключений`
- `стройки по районам`
- `активные стройки`
- `ввод в эксплуатацию`
- `что по строительству в советском районе`
- `покажи источники данных`
- `когда обновлялись данные`
- `что сейчас в жкх`
- `общественный транспорт`
- `остановки в советском районе`
- `остановки с павильоном`
- `сколько остановок в ленинском районе`
- `какие маршруты есть в академгородке`
- `топ транспортных узлов`
- `какой тариф на автобус`
- `какие остановки у маршрута 36`
- `сколько общих маршрутов между советским и центральным`
- `покажи общественный транспорт на карте`

## Тесты

```bash
npm test
npm run lint
npm run build
```

Фикстуры лежат в `src/live/tests/fixtures` и покрывают:

- parsing 051 (`запланированные/экстренные`, district breakdown, graceful degradation),
- parsing OpenData passport/CSV,
- parsing dataset 49/51 для общественного транспорта,
- active construction по `KadNom`,
- route parsing, district connectivity и transport selectors,
- district extraction из адресов,
- priority order `runtime -> snapshot -> cache -> mock`.

## Ограничения

- Нет backend/auth.
- Все workflow-действия над инцидентом 051 хранятся локально поверх источника 051.
- История 051 начинает накапливаться с момента запуска sync-скриптов.
- В демо-репозитории используются только текстовые ассеты (SVG/CSS/TS/JSON/HTML/CSV fixtures).

## Спросите Сигму (ask-sigma)

Модуль расположен в `src/features/ask-sigma/*` и теперь работает как с mock store, так и с селекторами актуальных данных.

### Pipeline
- `normalize -> special query handler -> router -> planner -> executor -> renderer`
- provider читает актуальные сводки, construction aggregates и source statuses из Zustand.
- Транспортный домен работает как детерминированный rule-based слой: без LLM runtime и без обращения к AI API.

### Ask Sigma + общественный транспорт
Поддерживаются типизированные ответы и deep-links в `/public-transport`:
- `остановки в советском районе`, `остановки с павильоном в ленинском районе`;
- `какие остановки у маршрута 36`, `маршруты в калининском районе`;
- `как проехать из академгородка в дзержинский район` (пересечение маршрутов по остановкам);
- `сколько общих маршрутов между советским и центральным`;
- `тариф на автобус`, `тарифы на проезд`, `топ транспортных узлов`;
- `покажи транспорт на карте`, `покажи транспорт в первомайском районе на карте`.

Районные фильтры:
- явный район в query имеет приоритет;
- если район не указан, используется глобальный district context Ask Sigma (implicit filter);
- подрайоны маппятся на parent district (например, `Академгородок -> Советский`) и выводятся как `Академгородок (Советский район)`.

Ограничения транспортных ответов:
- нет real-time движения транспорта и ETA в Ask Sigma;
- ответы строятся на открытых данных остановок/маршрутов/тарифов (dataset 49/51) и их snapshot/cache fallback.

### Как расширять
- intents/special команды: `src/features/ask-sigma/specialQueries.ts`
- маршрутизация: `src/features/ask-sigma/router.ts`
- планы: `src/features/ask-sigma/planner.ts`
- детерминированные ответы: `src/features/ask-sigma/executor.ts`
- рендер ответов: `src/features/ask-sigma/rendering/resultRenderers/*`

## Проверка интеграции локально

1. Запустить UI: `npm run dev`
3. Проверить:
   - `/mayor-dashboard` — KPI и карта 051;
   - `/briefing` — блок строительства;
   - `/operations` — фильтры `source/запланированные/экстренные/utility`;
   - `/public-transport` — карта Яндекса, фильтры, список остановок, тарифы и блок связности районов;
   - `/incidents/051-...` — карточку инцидента 051;
   - Ask Sigma запросами из списка выше.
4. Для транспортной вкладки проверьте сценарии:
   - фильтр по району, типу транспорта, номеру маршрута и павильону;
   - клик по остановке и открытие карточки маршрута;
   - тарифные карточки и source badges;
   - отсутствие транспорта в движении в реальном времени и ETA без официального realtime feed.
5. Для проверки fallback выставить `VITE_ENABLE_RUNTIME_LIVE_FETCH=false` или заблокировать доступ к источникам и убедиться, что UI остается рабочим.

## Школы и детские сады: новый модуль

### Route
- `/schools-kindergartens`

### Источники
- **Официальный OpenData Новосибирска**:
  - dataset **ID 28** — муниципальные школы;
  - dataset **ID 27** — муниципальные детские сады.
- **Жилые здания для spatial approximation**: OpenStreetMap / Overpass API.

### Как считается покрытие
- Модель помечена как `Approximate model`.
- Поддерживаются режимы:
  1. `nearest` — дом относится к ближайшему учреждению нужного типа;
  2. `radius` — упрощённый радиус обслуживания (по умолчанию: школа 1200м, детсад 700м, настраивается в UI).

### Важно про ограничения
- Это **не официальные зоны закрепления** домов за школами/детсадами.
- Это **не модель мест/зачисления** и не демографический прогноз.
- Это геометрическая approximation по открытым данным учреждений и жилых зданий.

### Fallback и snapshots
Для школ, детсадов и OSM-слоя работает тот же порядок:
1. runtime fetch;
2. snapshot (`/public/live-data/...`);
3. IndexedDB cache;
4. `mock-fallback`.

Если live-источник недоступен, вкладка не ломается и показывает честный source badge (`real / derived / approximate / mock-fallback`).
