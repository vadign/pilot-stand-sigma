# Server Deploy

Базовый изолированный вариант для сервера теперь такой: `Docker` + `docker compose`.
На хосте не нужны `node`, `npm`, `systemd` и host-`nginx`.

Причина та же: приложение не только отдает UI, но и:

- при старте делает `sync:live`;
- потом повторяет sync по расписанию;
- проксирует `/api/routes` и `/api/vehicles` для live-транспорта через Vite middleware.

Из-за этого схема `npm run build` + просто раздача `dist` статикой не подходит.

## Что использовать

- Docker image: [`Dockerfile`](/Users/vadign/pilot-stand-sigma/Dockerfile)
- Compose stack: [`compose.yml`](/Users/vadign/pilot-stand-sigma/compose.yml)
- app env example: [`deploy/docker/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/docker/sigma.env.example)
- internal nginx config: [`deploy/docker/nginx.conf`](/Users/vadign/pilot-stand-sigma/deploy/docker/nginx.conf)

## Требования на сервере

Нужны только:

- `docker`
- `docker compose`

Проверка:

```bash
docker --version
docker compose version
```

## Быстрый запуск

### 1. Подготовить код

```bash
cd /opt
git clone https://github.com/vadign/pilot-stand-sigma.git
cd /opt/pilot-stand-sigma
```

### 2. Подготовить env-файл для контейнера

```bash
cp deploy/docker/sigma.env.example deploy/docker/sigma.env
```

Минимально важные значения:

```env
VITE_SOURCE_MODE=hybrid
VITE_ENABLE_RUNTIME_LIVE_FETCH=false
SIGMA_PORT=5173
SIGMA_SNAPSHOT_SYNC_INTERVAL_MS=3600000
VITE_051_PORTAL_URL=https://map.novo-sibirsk.ru/portal/disconnections?t=
```

Если нужен ключ Яндекс.Карт, добавь его в `VITE_YANDEX_MAPS_API_KEY`.

### 3. Поднять контейнеры

```bash
docker compose up -d --build
```

По умолчанию compose поднимет:

- `app` с Node runtime внутри контейнера;
- `proxy` с `nginx`, который публикует приложение наружу на `80` порт.

Если внешний `80` уже занят, можно выбрать другой порт:

```bash
SIGMA_HTTP_PORT=8080 docker compose up -d --build
```

## Как это работает

Контейнер `app` запускает:

```bash
node --import tsx scripts/dev.mts --host 0.0.0.0 --port 5173
```

Это дает сразу три вещи:

- стартовую синхронизацию `public/live-data`;
- повторный sync по расписанию;
- HTTP-сервер приложения с транспортными `/api/*` endpoint'ами.

`nginx` контейнер только проксирует запросы на внутренний `app:5173`.

## Полезные команды

Статус:

```bash
docker compose ps
```

Логи приложения:

```bash
docker compose logs -f app
```

Логи прокси:

```bash
docker compose logs -f proxy
```

Перезапуск:

```bash
docker compose restart
```

Остановка:

```bash
docker compose down
```

## Обновление приложения

```bash
cd /opt/pilot-stand-sigma
git pull
docker compose up -d --build
```

## Что проверить после запуска

Открыть в браузере:

- `/`
- `/operations`
- `/history`
- `/public-transport`
- `/mayor-dashboard?subsystem=education`

Проверить ответы:

- `/live-data/manifest.json`
- `/live-data/051/latest.json`
- `/api/routes`

## Если у тебя уже есть внешний reverse proxy

Тогда внутренний `proxy` контейнер можно не использовать, а поднять только приложение:

```bash
docker compose up -d --build app
```

После этого проксируй внешний трафик на порт контейнера, который слушает `5173`.
Точнее: на `127.0.0.1:5173`, потому что compose публикует этот порт только на loopback интерфейс хоста.

## Альтернатива

Старый вариант с host `systemd` и host `nginx` оставлен как запасной:

- [`deploy/systemd/sigma.service`](/Users/vadign/pilot-stand-sigma/deploy/systemd/sigma.service)
- [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf)
- [`deploy/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/sigma.env.example)

Но для изолированного деплоя его больше использовать не нужно.
