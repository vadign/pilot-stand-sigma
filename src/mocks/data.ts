import { addDays, subDays } from 'date-fns'
import { getDataTypeLabel } from '../lib/dataTypes'
import type { District, Subsystem, DataSource, KpiMetric, Incident, ExecutiveBrief, Scenario, Deputy, Regulation, Notification, ServicePerformance } from '../types'

const now = new Date()

const districtDefinitions: Array<[string, string, District['center']]> = [
  ['len', 'Ленинский', [54.9836, 82.8813]],
  ['oct', 'Октябрьский', [55.0148, 82.9796]],
  ['zael', 'Заельцовский', [55.0671, 82.9054]],
  ['kal', 'Калининский', [55.0758, 82.9792]],
  ['kirov', 'Кировский', [54.9565, 82.9348]],
  ['sov', 'Советский', [54.8644, 83.0909]],
  ['perv', 'Первомайский', [54.9982, 83.1103]],
  ['dzer', 'Дзержинский', [55.0417, 82.9824]],
  ['kol', 'Кольцово', [54.9368, 83.1811]],
]

export const districts: District[] = districtDefinitions.map(([id, name, center]) => ({ id, name, center }))

const districtById = Object.fromEntries(districts.map((district) => [district.id, district])) as Record<string, District>

const districtIncidentOffsets: Array<[number, number]> = [
  [0.0042, -0.0028],
  [-0.0034, 0.0031],
  [0.0018, 0.0044],
]

const subsystemIncidentOffsets: Record<string, [number, number]> = {
  heat: [0.0016, -0.0007],
  roads: [-0.0008, 0.0012],
  noise: [0.0004, 0.0021],
  air: [-0.0014, -0.0016],
}

const getIncidentCoordinates = (districtId: string, occurrenceIndex: number, subsystemId: string): [number, number] => {
  const district = districtById[districtId] ?? districts[0]
  const [baseLat, baseLng] = district.center
  const [districtLatOffset, districtLngOffset] = districtIncidentOffsets[occurrenceIndex % districtIncidentOffsets.length]
  const [subsystemLatOffset, subsystemLngOffset] = subsystemIncidentOffsets[subsystemId] ?? [0, 0]

  return [
    Number((baseLat + districtLatOffset + subsystemLatOffset).toFixed(6)),
    Number((baseLng + districtLngOffset + subsystemLngOffset).toFixed(6)),
  ]
}

export const subsystems: Subsystem[] = [
{id:'heat',title:'Теплоснабжение',color:'#ef4444'},{id:'roads',title:'Дороги',color:'#f59e0b'},{id:'noise',title:'Шум и безопасность',color:'#8b5cf6'},{id:'air',title:'Качество воздуха',color:'#10b981'}]
export const dataSources: DataSource[] = [
{id:'s1',title:'ЕДДС 051',type:'real',freshness:'30 сек',provider:'051'},
{id:'s2',title:'Датчики воздуха Кольцово',type:'pilot',freshness:'5 мин',provider:'Внутренний контур'},
{id:'s3',title:'Расчет индекса загруженности',type:'calculated',freshness:'1 мин',provider:'Sigma Index'},
{id:'s4',title:'Сценарный модуль',type:'simulation',freshness:'по запуску',provider:'Sigma Sim'}]
export const kpis: KpiMetric[] = ([
['k1','Готовность ЖКХ','94%',2,'s1','real'],['k2','Среднее время устранения','2 ч 18 м',-4,'s3','calculated'],['k3','Индекс дорожной нагрузки','71/100',3,'s3','calculated'],['k4','Соблюдение регламентов','88%',1,'s3','calculated'],['k5','Жалобы по шуму','43',-2,'s1','real'],['k6','Индекс качества воздуха','62',-1,'s2','pilot']
] as [string,string,string,number,string,'real'|'calculated'|'simulation'|'pilot'][]).map(k=>({id:k[0],title:k[1],value:k[2],trend:k[3],sourceId:k[4],type:k[5],updatedAt:now.toISOString()}))
export const regulations: Regulation[] = Array.from({length:16}).map((_,i)=>({id:`r${i+1}`,code:`РГ-${100+i}`,title:`Регламент реагирования №${i+1}`,domain:['ЖКХ','Дороги','Безопасность','Экология'][i%4],version:`1.${i%3}`,status:i%5===0?'на ревизии':'активен',sourceDocument:'Постановление мэрии г. Новосибирска',sourceClause:`п.${(i%6)+1}.${(i%4)+1}`,effectiveFrom:subDays(now, 30+i).toISOString(),parameters:['время реакции','уровень риска'],recommendationTemplates:['уведомить службу','назначить бригаду'],coverageStatus:i%3===0?'частичное':'полное',linkedIncidentTypes:['heat','roads','noise','air'].slice(0,(i%4)+1)}))
export const incidents: Incident[] = Array.from({length:24}).map((_,i)=>{
  const subsystem = ['heat','roads','noise','air'][i%4]
  const district = districts[i%districts.length]
  const occurrenceIndex = Math.floor(i / districts.length)

  return {
    id:`INC-${1000+i}`,
    title:['Падение давления в магистрали','Обледенение перекрестка','Шумовая жалоба у ТЭЦ','Рост PM2.5'][i%4]+` (${i+1})`,
    subsystem,severity:(['средний','высокий','критический','низкий'] as const)[i%4],status:(['новый','в работе','эскалирован','архив'] as const)[i%4],district:district.id,
    coordinates:getIncidentCoordinates(district.id, occurrenceIndex, subsystem),createdAt:subDays(now,i%7).toISOString(),detectedAt:subDays(now,i%8).toISOString(),sourceId:['s1','s2','s3'][i%3],summary:'Требуется координация служб',description:'Инцидент выявлен автоматическим контуром. Необходимо выполнить действия по регламенту и отчитаться в журнале решений.',
    metrics:[{label:'Потери ресурса',value:`${10+i}%`,type:'calculated'},{label:'Тип данных',value:getDataTypeLabel((['real','pilot','calculated'] as const)[i%3]),type:(['real','pilot','calculated'] as const)[i%3]}],affectedPopulation:1500+i*120,linkedRegulationIds:[`r${(i%10)+1}`],
    recommendations:[{id:`rec-${i}`,title:'Базовый контур реагирования',sourceId:'s3',steps:[{id:'1',title:'Уведомить дежурного',done:true},{id:'2',title:'Проверить телеметрию',done:i%2===0},{id:'3',title:'Назначить бригаду',done:false}]}],
    assignee:['ЕДДС','Теплосеть','ДЭУ-3','Экоцентр'][i%4],deadline:addDays(now,1+i%4).toISOString(),progress:20+(i%5)*15,
    timeline:[{id:'t1',at:subDays(now,1).toISOString(),author:'Sigma',text:'Инцидент зарегистрирован'},{id:'t2',at:now.toISOString(),author:'Диспетчер',text:'Назначен ответственный'}]
  }
})
export const briefs: ExecutiveBrief[] = Array.from({length:10}).map((_,i)=>({id:`b${i+1}`,title:`Бриф №${i+1}: состояние городских контуров`,body:'Критические изменения за сутки: теплоснабжение в зоне контроля, рост нагрузки на улично-дорожную сеть в часы пик.',incidentIds:[incidents[i].id,incidents[i+1].id],sourceId:'s3',type:'calculated',updatedAt:now.toISOString()}))
export const scenarios: Scenario[] = Array.from({length:5}).map((_,i)=>({id:`sc${i+1}`,title:['Морозный пик','Снегопад и заторы','Ремонт теплосети','Сильный ветер','Ночной шум'][i],description:'Сценарий для проверки устойчивости служб',parameters:{temperature:-20+i,traffic:40+i*8},impacts:[{label:'Рост инцидентов',value:12+i*4},{label:'Задержка',value:15+i*2}],comparisonBaseline:'Текущая неделя',serviceLoad:62+i*5,timelinePoints:[{name:'0ч',value:20},{name:'6ч',value:30+i*2},{name:'12ч',value:45+i*3},{name:'24ч',value:38+i*2}]}))
export const deputies: Deputy[] = [
{id:'d1',name:'Заместитель по теплоснабжению',domain:'ЖКХ',mode:'approval',connectedSourceIds:['s1','s3'],activeIncidentIds:incidents.filter(i=>i.subsystem==='heat').slice(0,3).map(i=>i.id),permissions:['эскалация','назначение бригад'],latestActions:['Согласована аварийная бригада'],constraints:['Не закрывать без фотофиксации'],escalationRate:0.31},
{id:'d2',name:'Заместитель по дорожной обстановке',domain:'Транспорт',mode:'recommendation',connectedSourceIds:['s1','s3'],activeIncidentIds:incidents.filter(i=>i.subsystem==='roads').slice(0,3).map(i=>i.id),permissions:['перераспределение техники'],latestActions:['Предложена очистка маршрута №13'],constraints:['Без перекрытия магистралей'],escalationRate:0.21},
{id:'d3',name:'Заместитель по воздуху',domain:'Экология',mode:'autonomous',connectedSourceIds:['s2','s3'],activeIncidentIds:incidents.filter(i=>i.subsystem==='air').slice(0,3).map(i=>i.id),permissions:['автозапуск оповещения'],latestActions:['Запущено предупреждение по PM2.5'],constraints:['Порог PM2.5 > 35'],escalationRate:0.15},
{id:'d4',name:'Заместитель по шуму и безопасности',domain:'Безопасность',mode:'recommendation',connectedSourceIds:['s1'],activeIncidentIds:incidents.filter(i=>i.subsystem==='noise').slice(0,3).map(i=>i.id),permissions:['маршрут патруля'],latestActions:['Согласован патруль'],constraints:['Только ночной режим'],escalationRate:0.26},
]
export const notifications: Notification[] = Array.from({length:12}).map((_,i)=>({id:`n${i+1}`,text:`Оповещение ${i+1}: изменение статуса по зоне ${districts[i%districts.length].name}`,level:(['низкий','средний','высокий','критический'] as const)[i%4],createdAt:subDays(now,i%3).toISOString()}))
export const servicePerformance: ServicePerformance[] = ['ЕДДС','Теплосети','ДЭУ','Экоцентр','Патруль'].map((s,i)=>({id:`sp${i}`,service:s,resolvedInTime:80+i*3,avgMinutes:90-i*8,incidents:35+i*4}))
