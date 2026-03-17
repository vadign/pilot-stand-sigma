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

## Спросите Сигму (ask-sigma)
- Глобальная строка запроса находится в шапке shell (`src/components/Layout.tsx`) и работает для текста и голоса через единый pipeline.
- Архитектура feature: `normalize -> special query handler -> router -> planner -> executor -> renderer`.
- Модуль расположен в `src/features/ask-sigma/*`.

### Голосовой ввод
- Используется Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) в `src/features/ask-sigma/voice/useVoiceInput.ts`.
- Язык: `ru-RU`.
- Wake-word: `Сигма` + частые варианты распознавания (`Сима`, `Сегма`) через regex в `voiceRegex.ts`.
- Команды смены роли поддерживаются как текстом, так и голосом: `мэр`, `диспетчер`, `аналитик`, включая район ответственности.

### Поддерживаемые запросы
- Роль/контекст: `Сигма, мэр`, `Сигма, диспетчер Советский район`.
- Сводки: `что происходит сейчас`, `сводка за 24 часа`.
- Инциденты: `критичные инциденты по отоплению`, `открой инцидент SIG-88291`.
- Регламенты: `что делать при прорыве теплотрассы`, `какой регламент по воздуху`.
- Аналитика/сценарии: `динамика отключений за неделю`, `сценарий аномальных морозов`, `сравни без вмешательства и с вмешательством`.
- Заместители/согласование: `что у заместителя по теплоснабжению`, `переведи заместителя по теплу в режим подтверждения`, `что требует согласования`.
- Навигация: `открой регламенты`, `открой историю`, `открой цифровых заместителей`.

### Как расширять
- Новые intents/special команды: `src/features/ask-sigma/specialQueries.ts`.
- Новые topic/entity маршруты: `src/features/ask-sigma/router.ts`.
- Новые операции планировщика: `src/features/ask-sigma/planner.ts`.
- Новые детерминированные ответы: `src/features/ask-sigma/executor.ts`.
- Новые UI-блоки рендера: `src/features/ask-sigma/rendering/resultRenderers/*`.
- Для backend в будущем используйте `RemoteAskSigmaProvider` в `src/features/ask-sigma/provider.ts`.
