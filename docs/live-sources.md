# Live sources in Sigma

## 1. 051: отключения ЖКХ

### Источник
- `https://051.novo-sibirsk.ru/SitePages/off.aspx`

### Что извлекается
- `planned | emergency`
- `hot_water | cold_water | sewer | electricity | gas | heating`
- число домов
- район
- snapshot timestamp
- reason / recovery time / description, если доступны в тексте

### Sigma mapping
- raw model: `Power051Snapshot`, `Power051DistrictStat`, `Power051UtilityBucket`
- domain model: `SigmaLiveOutageIncident`, `SigmaLiveOutageSummary`
- координаты: центроиды районов
- уровень детализации: `district-level`

## 2. OpenData Novosibirsk

### MVP datasets
- `124` — разрешения на строительство
- `125` — ввод в эксплуатацию

### Поля
#### 124
- `NomRazr`
- `DatRazr`
- `Zastr`
- `NameOb`
- `AdrOr`
- `KadNom`

#### 125
- `NomRazr`
- `DatRazr`
- `Zastr`
- `NameOb`
- `Raion`
- `AdrOb`
- `KadNom`

### Sigma mapping
- `ConstructionPermitRecord`
- `ConstructionCommissionedRecord`
- `ConstructionActiveRecord`
- `DistrictConstructionAggregate`

### Derived metric
`activeConstruction = permits - commissioned` по `KadNom`.

Если район отсутствует в явном поле, Sigma пытается извлечь его из адреса по шаблонам.

## 3. Freshness и fallback

### TTL
- 051 — 30 минут
- OpenData — 24 часа

### Cache entry
- `payload`
- `fetchedAt`
- `expiresAt`
- `sourceUrl`
- `etag/lastModified` при наличии
- `parseVersion`
- `errorState`

### Priority
1. runtime live fetch (direct URL → optional proxy fallback)
2. snapshot asset
3. IndexedDB cache
4. mock fallback

## 4. Known limitations

- В текущем demo 051 чаще всего дает районный уровень, а не дом.
- Runtime fetch сначала идет в прямой официальный URL и только затем в optional proxy; оба шага могут упереться в CORS/сетевые ограничения браузера или среды.
- История 051 начинает накапливаться только после первых запусков sync.
- Координаты для OpenData не додумываются, если в исходном наборе их нет.
- В sandbox CI/agent среда может не иметь доступа к официальным доменам; для этого в репозитории лежат fixture snapshots.
