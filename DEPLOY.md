# Server Deploy

Этот проект сейчас корректно деплоится как long-running Node process через `systemd`.
Причина простая: приложение не только отдает UI, но и:

- при старте делает `sync:live`;
- потом повторяет sync по расписанию;
- проксирует `/api/routes` и `/api/vehicles` для live-транспорта через Vite middleware.

Из-за этого обычная схема `npm run build` + статический `nginx` без Node-процесса здесь не подходит.

## Что использовать

- systemd unit: [`deploy/systemd/sigma.service`](/Users/vadign/pilot-stand-sigma/deploy/systemd/sigma.service)
- nginx config: [`deploy/nginx/sigma.conf`](/Users/vadign/pilot-stand-sigma/deploy/nginx/sigma.conf)
- server env example: [`deploy/sigma.env.example`](/Users/vadign/pilot-stand-sigma/deploy/sigma.env.example)

## Быстрый запуск

### 1. Подготовить код

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/vadign/pilot-stand-sigma.git
sudo chown -R $USER:$USER /opt/pilot-stand-sigma
cd /opt/pilot-stand-sigma
npm ci
```

### 2. Создать системного пользователя

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin sigma
sudo chown -R sigma:sigma /opt/pilot-stand-sigma
```

### 3. Подготовить env-файл

```bash
sudo mkdir -p /etc/sigma
sudo cp /opt/pilot-stand-sigma/deploy/sigma.env.example /etc/sigma/sigma.env
sudo chown root:sigma /etc/sigma/sigma.env
sudo chmod 640 /etc/sigma/sigma.env
```

Рекомендуемые значения:

```env
VITE_SOURCE_MODE=hybrid
VITE_ENABLE_RUNTIME_LIVE_FETCH=false
SIGMA_PORT=5173
SIGMA_SNAPSHOT_SYNC_INTERVAL_MS=3600000
VITE_051_PORTAL_URL=https://map.novo-sibirsk.ru/portal/disconnections?t=
```

### 4. Установить systemd unit

```bash
sudo cp /opt/pilot-stand-sigma/deploy/systemd/sigma.service /etc/systemd/system/sigma.service
```

Если у тебя другой путь к проекту или другой пользователь, поправь в unit:

- `User=`
- `Group=`
- `WorkingDirectory=`

### 5. Запустить сервис

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sigma
sudo systemctl status sigma
```

Полезные команды:

```bash
journalctl -u sigma -f
systemctl restart sigma
systemctl stop sigma
```

## Nginx

Установи конфиг:

```bash
sudo cp /opt/pilot-stand-sigma/deploy/nginx/sigma.conf /etc/nginx/sites-available/sigma.conf
sudo ln -sf /etc/nginx/sites-available/sigma.conf /etc/nginx/sites-enabled/sigma.conf
sudo nginx -t
sudo systemctl reload nginx
```

Перед этим при необходимости поправь в конфиге:

- `server_name`
- `proxy_pass`, если выберешь другой `SIGMA_PORT`

## Как это работает после запуска

Сервис стартует командой:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Это дает сразу три вещи:

- стартовую синхронизацию `public/live-data`;
- повторный sync по расписанию;
- HTTP-сервер приложения с транспортными `/api/*` endpoint'ами.

## Обновление приложения

```bash
cd /opt/pilot-stand-sigma
git pull
npm ci
sudo systemctl restart sigma
```

## Что проверить после деплоя

Открыть в браузере:

- `/`
- `/operations`
- `/history`
- `/public-transport`

Проверить ответы:

- `/live-data/manifest.json`
- `/live-data/051/latest.json`
- `/api/routes`

## Важное ограничение

Если захочешь именно классический production-режим без Vite dev server, это уже отдельная задача.
Тогда нужно выносить:

- планировщик sync в отдельный процесс;
- `/api/routes` и `/api/vehicles` в отдельный backend/proxy;
- раздачу UI в отдельный static server.
