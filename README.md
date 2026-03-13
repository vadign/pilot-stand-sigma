# Сигма — frontend-only демо

## Важно про дизайн
В этом репозитории редизайн вынесен в отдельную ветку: **`redesign-from-scratch`**.

Если вы видите старый интерфейс, проверьте:
1. `git branch --show-current` (должно быть `redesign-from-scratch`)
2. Перезапустите dev-сервер: `npm run dev`
3. Сделайте hard reload в браузере (`Ctrl+F5`)

## Запуск
- `npm install`
- `npm run dev`
- `npm run build`

## Маршруты
- `/mayor-dashboard` — Панель мэра
- `/briefing` — Управленческий бриф
- `/operations` — Оперативный монитор
- `/incidents/:id` — Карточка инцидента
- `/history` — История и аналитика
- `/scenarios` — Сценарии и прогнозы
- `/deputies` — Цифровые заместители
- `/regulations` — Реестр регламентов

## Данные
- Mock-данные: `src/mocks/data.ts`
- Типы: `src/types/index.ts`
- Единый Zustand-store: `src/store/useSigmaStore.ts`

## Провайдеры и расширение
- Интерфейсы и mock-адаптеры: `src/lib/providers/index.ts`
- Для подключения реальных источников создайте реализации интерфейсов (`Power051Provider`, `OpenMeteoProvider`, `OverpassCameraProvider`, `MunicipalOpenDataProvider`) и подмените инъекцию в store/features.

## Ограничения демо
- Нет backend/auth.
- Все действия выполняются в клиентском состоянии.
- Данные simulation (сценарии) не меняют факт по инцидентам.
- В демо-репозитории используются только текстовые ассеты (SVG/CSS/TS), бинарные медиа-ассеты исключены.
