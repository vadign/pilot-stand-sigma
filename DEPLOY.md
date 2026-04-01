# Server Deploy

Базовый изолированный вариант для сервера теперь такой: `Docker` + `docker compose`.
На хосте не нужны `node`, `npm` и `systemd`.

Причина та же: приложение не только отдает UI, но и:

- при старте делает `sync:live`;
- потом повторяет sync по расписанию;
- проксирует `/api/routes` и `/api/vehicles` для live-транспорта через Vite middleware.
- держит in-memory presentation sessions и SSE-стрим `/session/*/stream` для двухэкранного режима.

Поэтому в деплое нельзя держать `vite dev`/HMR. Нужна production-схема: `npm run build` и запуск `vite preview` (через `npm run start`) с middleware для `/api/*` и `/session/*/stream`.

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
SIGMA_PORT=4173
SIGMA_SNAPSHOT_SYNC_INTERVAL_MS=3600000
VITE_051_PORTAL_URL=https://map.novo-sibirsk.ru/portal/disconnections?t=
```

Если нужен ключ Яндекс.Карт, добавь его в `VITE_YANDEX_MAPS_API_KEY`.

### 3. Поднять контейнер

```bash
docker compose up -d --build
```

По умолчанию compose поднимет один контейнер `app` с Node runtime внутри.
Он публикуется наружу на `4173` порт (production preview).

Если нужен другой внешний порт:

```bash
SIGMA_APP_PORT=8080 docker compose up -d --build
```

## Как это работает

Контейнер `app` запускает:

```bash
npm run build && node --import tsx scripts/start.mts --host 0.0.0.0 --port 4173
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

- `http://server:4173/`

Проверить ответы:

- `/live-data/manifest.json`
- `/live-data/051/latest.json`
- `/api/routes`
- `/display`
- `/mobile?s=<sid>` после создания presentation session

## Если у тебя уже есть свой nginx

Тогда ничего дополнительного в compose не нужно.
Просто проксируй на опубликованный порт приложения:

- `http://127.0.0.1:4173`

Готовый пример конфига уже есть в [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf).

Для presentation mode важно:

- не включать buffering на `/session/*/stream`;
- оставлять длинные `proxy_read_timeout` и `proxy_send_timeout`;
- прокидывать `X-Forwarded-Proto`, чтобы QR и session URLs строились с правильным `http/https`.

### Smoke-check presentation SSE

Быстрый ручной smoke после деплоя:

1. Создай сессию:

```bash
curl -sS -X POST http://127.0.0.1:5173/session/create
```

Сохрани `sid` из ответа.

2. Открой stream и проверь, что приходят `snapshot` и периодические `heartbeat`:

```bash
curl -N http://127.0.0.1:5173/session/<sid>/stream
```

3. В другом терминале отправь команду и убедись, что в stream появился `scene` event:

```bash
curl -sS -X POST http://127.0.0.1:5173/session/<sid>/command \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"smoke-mobile","role":"mobile","type":"navigate","scene":{"kind":"operations"}}'
```

Если не хочешь светить порт наружу вообще, в [`compose.yml`](/Users/vadign/pilot-stand-sigma/compose.yml) можно заменить:

```yaml
ports:
  - "${SIGMA_APP_PORT:-4173}:4173"
```

на:

```yaml
ports:
  - "127.0.0.1:4173:4173"
```

Тогда приложение будет доступно только локально на хосте, а наружу его будет отдавать уже ваш `nginx`.

## Альтернатива

Старый вариант с host `systemd` и host `nginx` оставлен как запасной:

- [`deploy/systemd/sigma.service`](/Users/vadign/pilot-stand-sigma/deploy/systemd/sigma.service)
- [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf)
- [`deploy/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/sigma.env.example)

Но для изолированного деплоя его больше использовать не нужно.


## Проверка, что не запущен dev-сервер

На хосте проверьте активный процесс и unit/compose/pm2 команды запуска. В конфигурации не должно быть `vite`, `vite dev`, `npm run dev` для production-инстанса.

```bash
# systemd
systemctl cat sigma.service
systemctl status sigma --no-pager
ps -fp $(pgrep -f "sigma|vite|tsx scripts/start.mts" | tr "\n" " ")

# docker compose
docker compose ps
docker compose logs --tail=100 app
docker compose exec app ps -ef

# pm2 (если используется)
pm2 list
pm2 show sigma
```

Ожидаемо в запуске: `npm run start` / `vite preview`, а не `npm run dev`.

## Проверка после деплоя (cache + network)

1. Откройте DevTools → Network.
2. Включите **Disable cache**.
3. Сделайте **Hard Reload** (Ctrl+Shift+R).
4. Убедитесь, что больше нет запросов к:
   - `/src/*.tsx`
   - `/node_modules/.vite/deps/...`

Если такие запросы есть, значит трафик все еще идет на dev/HMR endpoint.
