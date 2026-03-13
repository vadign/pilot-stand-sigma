import { create } from 'zustand'
import { briefs, dataSources, deputies, districts, incidents, kpis, notifications, regulations, scenarios, servicePerformance, subsystems } from '../mocks/data'
import type { ScenarioRun } from '../types'

interface SigmaState {
  districts: typeof districts; subsystems: typeof subsystems; dataSources: typeof dataSources; kpis: typeof kpis; incidents: typeof incidents;
  briefs: typeof briefs; scenarios: typeof scenarios; scenarioRuns: ScenarioRun[]; deputies: typeof deputies; regulations: typeof regulations;
  notifications: typeof notifications; servicePerformance: typeof servicePerformance; selectedIncidentId?: string; liveTick: number;
  setSelectedIncident: (id:string)=>void; escalateIncident:(id:string)=>void; resolveIncident:(id:string)=>void; archiveIncident:(id:string)=>void;
  assignIncident:(id:string,assignee:string)=>void; toggleRecommendationStep:(incidentId:string,recId:string,stepId:string)=>void; addTimeline:(incidentId:string,text:string)=>void;
  approveIncident:(id:string)=>void; runScenario:(scenarioId:string)=>void; saveScenario:(runId:string)=>void; setDeputyMode:(id:string,mode:'recommendation'|'approval'|'autonomous')=>void;
  createRegulation:(title:string,domain:string)=>void; bumpLive:()=>void
}

export const useSigmaStore = create<SigmaState>((set,get)=>({
  districts,subsystems,dataSources,kpis,incidents,briefs,scenarios,scenarioRuns:[],deputies,regulations,notifications,servicePerformance,liveTick:0,
  setSelectedIncident:(id)=>set({selectedIncidentId:id}),
  escalateIncident:(id)=>set(s=>({incidents:s.incidents.map(i=>i.id===id?{...i,severity:i.severity==='критический'?'критический':'высокий',status:'эскалирован',timeline:[...i.timeline,{id:crypto.randomUUID(),at:new Date().toISOString(),author:'Sigma',text:'Инцидент эскалирован'}]}:i)})),
  resolveIncident:(id)=>set(s=>({incidents:s.incidents.map(i=>i.id===id?{...i,status:'решен',progress:100,timeline:[...i.timeline,{id:crypto.randomUUID(),at:new Date().toISOString(),author:'Диспетчер',text:'Инцидент закрыт'}]}:i)})),
  archiveIncident:(id)=>set(s=>({incidents:s.incidents.map(i=>i.id===id?{...i,status:'архив'}:i)})),
  assignIncident:(id,assignee)=>set(s=>({incidents:s.incidents.map(i=>i.id===id?{...i,assignee,timeline:[...i.timeline,{id:crypto.randomUUID(),at:new Date().toISOString(),author:'Оператор',text:`Назначен: ${assignee}` }]}:i)})),
  toggleRecommendationStep:(incidentId,recId,stepId)=>set(s=>({incidents:s.incidents.map(i=>i.id!==incidentId?i:{...i,recommendations:i.recommendations.map(r=>r.id!==recId?r:{...r,steps:r.steps.map(st=>st.id===stepId?{...st,done:!st.done}:st)})})})),
  addTimeline:(incidentId,text)=>set(s=>({incidents:s.incidents.map(i=>i.id===incidentId?{...i,timeline:[...i.timeline,{id:crypto.randomUUID(),at:new Date().toISOString(),author:'Руководитель',text}]}:i)})),
  approveIncident:(id)=>set(s=>({incidents:s.incidents.map(i=>i.id===id?{...i,status:'в работе',timeline:[...i.timeline,{id:crypto.randomUUID(),at:new Date().toISOString(),author:'Мэр',text:'Действие одобрено'}]}:i)})),
  runScenario:(scenarioId)=>set(s=>({scenarioRuns:[...s.scenarioRuns,{id:crypto.randomUUID(),scenarioId,at:new Date().toISOString(),status:'выполняется',projectedIncidents:0,expectedDelay:0,serviceLoad:0}]})),
  saveScenario:(runId)=>{const run=get().scenarioRuns.find(r=>r.id===runId); if(run) localStorage.setItem(`sigma-run-${run.id}`,JSON.stringify(run))},
  setDeputyMode:(id,mode)=>set(s=>({deputies:s.deputies.map(d=>d.id===id?{...d,mode}:d)})),
  createRegulation:(title,domain)=>set(s=>({regulations:[{id:crypto.randomUUID(),code:`РГ-${200+s.regulations.length}`,title,domain,version:'1.0',status:'активен',sourceDocument:'Проект',sourceClause:'п.1.1',effectiveFrom:new Date().toISOString(),parameters:['время реакции'],recommendationTemplates:['уведомление'],coverageStatus:'частичное',linkedIncidentTypes:['heat']},...s.regulations]})),
  bumpLive:()=>set(s=>({liveTick:s.liveTick+1,scenarioRuns:s.scenarioRuns.map((r,idx)=>r.status==='готово'?r:{...r,status: idx%2===0?'готово':'выполняется',projectedIncidents:22+idx*3,expectedDelay:14+idx*2,serviceLoad:65+idx*4}),notifications:[{id:crypto.randomUUID(),text:'Новый alert: превышение порога по шуму',level:'высокий' as const,createdAt:new Date().toISOString()},...s.notifications].slice(0,15)}))
}))
