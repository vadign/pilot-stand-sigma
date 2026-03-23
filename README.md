# Sigma — frontend-only live demo

Sigma остается frontend-only приложением на React + Vite + TypeScript. В этой версии добавлен двухконтурный live ingestion для официальных источников Новосибирска без runtime-backend:

- **051** — отключения ЖКХ: `https://051.novo-sibirsk.ru/SitePages/off.aspx`
- **OpenData Novosibirsk** — строительные наборы 124/125: `https://opendata.novo-sibirsk.ru`

## Что теперь умеет приложение

### Режимы данных
Через env доступны три режима:

- `mock` — только текущие моки.
- `hybrid` — live там, где данные доступны, и mock fallback в остальном. **Режим по умолчанию.**
- `live` — приоритет на реальные данные; если live недоступен, UI честно падает в snapshot/cache/mock fallback.

### Порядок источников
Для live-контуров используется одинаковый приоритет:

1. runtime live fetch из браузера,
2. локальный snapshot (`public/live-data/*`),
3. IndexedDB cache,
4. mock fallback.

### Где live-данные уже интегрированы
- `/mayor-dashboard` — KPI по отключениям, карта проблем, топ районов, статус ЖКХ.
- `/briefing` — ежедневный бриф по 051 + строительная активность по районам.
- `/operations` — live-feed 051 с фильтрами `planned/emergency`, `utility`, `district`, `source`.
- `/incidents/:id` — карточка live-инцидента с районным уровнем детализации и локальным workflow поверх источника 051.
- `/history` — тренд по накопленным snapshot 051 и строительная аналитика по open data.
- `/deputies` — live-показатели для ЖКХ/теплоснабжения.
- `/regulations` — live linkage `utilityType/outageType -> регламент`, `active construction -> контроль`.
- Ask Sigma — live-вопросы по отключениям, стройке, freshness и статусам источников.

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

## Синхронизация live snapshots

### `npm run sync:051`
- загружает `off.aspx`;
- сохраняет raw HTML snapshot;
- парсит `planned/emergency`;
- нормализует в JSON;
- обновляет `public/live-data/051/latest.json`;
- добавляет запись в `public/live-data/051/history/index.json` и timestamp-файл.

### `npm run sync:opendata`
- загружает паспорта и CSV для dataset `124` и `125`;
- сохраняет raw HTML/CSV;
- строит `construction-permits.json`, `construction-commissioned.json`, `construction-active.json`, `construction-bundle.json`.

### `npm run sync:live`
Запускает обе синхронизации и пересобирает `public/live-data/manifest.json`.

### `npm run sync:live:hourly`
Запускает стартовую синхронизацию, затем повторяет `sync:live` раз в час в фоновом long-running процессе.

Интервал можно переопределить так: `SIGMA_SNAPSHOT_SYNC_INTERVAL_MS=1800000 npm run dev`.
По умолчанию используется `3600000` миллисекунд, то есть 1 час.

> В sandbox этого задания внешние сайты были недоступны, поэтому sync-скрипты автоматически откатились на fixture snapshots. В обычной среде с доступом к доменам они используют реальные официальные источники.

## Структура live-модуля

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

## Как добавить новый dataset из OpenData

1. Добавьте описание в `src/live/config/opendataDatasets.ts`.
2. Расширьте parser/normalizer под новую схему CSV.
3. Добавьте snapshot запись в `scripts/sync-opendata.mts`.
4. Добавьте selector/UI consumption.
5. Зафиксируйте fallback/meta block: источник, обновление, TTL, тип данных.

## Поведение при недоступности live

Sigma **не подменяет реальность симуляцией**.

- если 051 доступен только на районном уровне — карта и карточка показывают именно уровень района;
- если OpenData не дал координаты — они не придумываются;
- если данные старые — возраст виден в мета-блоке;
- если runtime fetch не удался — Ask Sigma и UI пишут, что показан snapshot/cache/mock fallback.

## Ask Sigma: поддерживаемые live-запросы

- `отключения сейчас`
- `аварийные отключения`
- `плановые отключения`
- `отключения по районам`
- `отключения отопления`
- `где больше всего отключений`
- `стройки по районам`
- `активные стройки`
- `ввод в эксплуатацию`
- `что по строительству в советском районе`
- `покажи live-источники`
- `когда обновлялись данные`
- `что сейчас в жкх`

## Тесты

```bash
npm test
npm run lint
npm run build
```

Фикстуры лежат в `src/live/tests/fixtures` и покрывают:

- parsing 051 (`planned/emergency`, district breakdown, graceful degradation),
- parsing OpenData passport/CSV,
- active construction по `KadNom`,
- district extraction из адресов,
- priority order `runtime -> snapshot -> cache -> mock`.

## Ограничения

- Нет backend/auth.
- Все workflow-действия над live-инцидентом хранятся локально поверх источника 051.
- История 051 начинает накапливаться с момента запуска sync-скриптов.
- В демо-репозитории используются только текстовые ассеты (SVG/CSS/TS/JSON/HTML/CSV fixtures).

## Спросите Сигму (ask-sigma)

Модуль расположен в `src/features/ask-sigma/*` и теперь работает как с mock store, так и с live selectors.

### Pipeline
- `normalize -> special query handler -> router -> planner -> executor -> renderer`
- provider читает live-сводки, construction aggregates и source statuses из Zustand.

### Как расширять
- intents/special команды: `src/features/ask-sigma/specialQueries.ts`
- маршрутизация: `src/features/ask-sigma/router.ts`
- планы: `src/features/ask-sigma/planner.ts`
- детерминированные live-ответы: `src/features/ask-sigma/executor.ts`
- рендер ответов: `src/features/ask-sigma/rendering/resultRenderers/*`

## Проверка live-интеграции локально

1. Запустить UI: `npm run dev`
3. Проверить:
   - `/mayor-dashboard` — KPI и карта 051;
   - `/briefing` — блок строительства;
   - `/operations` — фильтры `source/planned/emergency/utility`;
   - `/incidents/051-...` — карточку live-инцидента;
   - Ask Sigma запросами из списка выше.
4. Для проверки fallback выставить `VITE_ENABLE_RUNTIME_LIVE_FETCH=false` или заблокировать доступ к источникам и убедиться, что UI остается рабочим.
