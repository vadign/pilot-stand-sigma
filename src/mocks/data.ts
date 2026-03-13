import { addDays, subDays } from 'date-fns'
import type { District, Subsystem, DataSource, KpiMetric, Incident, ExecutiveBrief, Scenario, Deputy, Regulation, Notification, ServicePerformance } from '../types'
const now = new Date()
export const districts: District[] = [
  ['len','Ленинский'],['oct','Октябрьский'],['zael','Заельцовский'],['kal','Калининский'],['kirov','Кировский'],['sov','Советский'],['perv','Первомайский'],['dzer','Дзержинский'],['kol','Кольцово']
].map((d,i)=>({id:d[0],name:d[1],center:[55.03+i*0.01,82.89+i*0.01]} as District))
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
export const incidents: Incident[] = Array.from({length:24}).map((_,i)=>({
  id:`INC-${1000+i}`,
  title:['Падение давления в магистрали','Обледенение перекрестка','Шумовая жалоба у ТЭЦ','Рост PM2.5'][i%4]+` (${i+1})`,
  subsystem:['heat','roads','noise','air'][i%4],severity:(['средний','высокий','критический','низкий'] as const)[i%4],status:(['новый','в работе','эскалирован','архив'] as const)[i%4],district:districts[i%districts.length].id,
  coordinates:[55.02+(i%8)*0.02,82.85+(i%8)*0.02],createdAt:subDays(now,i%7).toISOString(),detectedAt:subDays(now,i%8).toISOString(),sourceId:['s1','s2','s3'][i%3],summary:'Требуется координация служб',description:'Инцидент выявлен автоматическим контуром. Необходимо выполнить действия по регламенту и отчитаться в журнале решений.',
  metrics:[{label:'Потери ресурса',value:`${10+i}%`,type:'calculated'},{label:'Тип данных',value:['real','pilot','calculated'][i%3],type:(['real','pilot','calculated'] as const)[i%3]}],affectedPopulation:1500+i*120,linkedRegulationIds:[`r${(i%10)+1}`],
  recommendations:[{id:`rec-${i}`,title:'Базовый контур реагирования',sourceId:'s3',steps:[{id:'1',title:'Уведомить дежурного',done:true},{id:'2',title:'Проверить телеметрию',done:i%2===0},{id:'3',title:'Назначить бригаду',done:false}]}],
  assignee:['ЕДДС','Теплосеть','ДЭУ-3','Экоцентр'][i%4],deadline:addDays(now,1+i%4).toISOString(),progress:20+(i%5)*15,
  timeline:[{id:'t1',at:subDays(now,1).toISOString(),author:'Sigma',text:'Инцидент зарегистрирован'},{id:'t2',at:now.toISOString(),author:'Диспетчер',text:'Назначен ответственный'}]
}))
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
