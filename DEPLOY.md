# Server Deploy

Базовый изолированный вариант для сервера теперь такой: `Docker` + `docker compose`.
На хосте не нужны `node`, `npm` и `systemd`.

Причина та же: приложение не только отдает UI, но и:

- при старте делает `sync:live`;
- потом повторяет sync по расписанию;
- проксирует `/api/routes` и `/api/vehicles` для live-транспорта через Vite middleware.
- держит in-memory presentation sessions и SSE-стрим `/session/*/stream` для двухэкранного режима.

Из-за этого схема `npm run build` + просто раздача `dist` статикой не подходит.

## Что использовать

- Docker image: [`Dockerfile`](/Users/vadign/pilot-stand-sigma/Dockerfile)
- Compose stack: [`compose.yml`](/Users/vadign/pilot-stand-sigma/compose.yml)
- app env example: [`deploy/docker/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/docker/sigma.env.example)
- optional host nginx config: [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf)

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

### 3. Поднять контейнер

```bash
docker compose up -d --build
```

По умолчанию compose поднимет один контейнер `app` с Node runtime внутри.
Он публикуется наружу на `5173` порт.

Если нужен другой внешний порт:

```bash
SIGMA_APP_PORT=8080 docker compose up -d --build
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

## Полезные команды

Статус:

```bash
docker compose ps
```

Логи приложения:

```bash
docker compose logs -f app
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

То есть по умолчанию:

- `http://server:5173/`

Проверить ответы:

- `/live-data/manifest.json`
- `/live-data/051/latest.json`
- `/api/routes`
- `/display`
- `/mobile?s=<sid>` после создания presentation session

## Если у тебя уже есть свой nginx

Тогда ничего дополнительного в compose не нужно.
Просто проксируй на опубликованный порт приложения:

- `http://127.0.0.1:5173`

Готовый пример конфига уже есть в [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf).

Для presentation mode важно:

- не включать buffering на `/session/*/stream`;
- оставлять длинные `proxy_read_timeout` и `proxy_send_timeout`;
- прокидывать `X-Forwarded-Proto`, чтобы QR и session URLs строились с правильным `http/https`.

Если не хочешь светить порт наружу вообще, в [`compose.yml`](/Users/vadign/pilot-stand-sigma/compose.yml) можно заменить:

```yaml
ports:
  - "${SIGMA_APP_PORT:-5173}:5173"
```

на:

```yaml
ports:
  - "127.0.0.1:5173:5173"
```

Тогда приложение будет доступно только локально на хосте, а наружу его будет отдавать уже ваш `nginx`.

## Альтернатива

Старый вариант с host `systemd` и host `nginx` оставлен как запасной:

- [`deploy/systemd/sigma.service`](/Users/vadign/pilot-stand-sigma/deploy/systemd/sigma.service)
- [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf)
- [`deploy/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/sigma.env.example)

Но для изолированного деплоя его больше использовать не нужно.
