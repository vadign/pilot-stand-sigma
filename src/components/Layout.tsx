import { NavLink, Outlet } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useSigmaStore } from '../store/useSigmaStore'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useEffect, useState } from 'react'

const nav=[['/mayor-dashboard','Панель мэра'],['/briefing','Бриф'],['/operations','Оперативный монитор'],['/history','История'],['/scenarios','Сценарии'],['/deputies','Цифровые заместители'],['/regulations','Регламенты']]
export function Layout(){
  const notifications=useSigmaStore(s=>s.notifications); const bump=useSigmaStore(s=>s.bumpLive); const [query,setQuery]=useState(''); const [open,setOpen]=useState(false)
  const incidents=useSigmaStore(s=>s.incidents); const regulations=useSigmaStore(s=>s.regulations); const scenarios=useSigmaStore(s=>s.scenarios)
  useEffect(()=>{const t=setInterval(()=>bump(),12000); return ()=>clearInterval(t)},[bump])
  const found: Array<{id?: string; code?: string; title?: string; name?: string}>=[...incidents.filter(i=>i.title.toLowerCase().includes(query.toLowerCase())||i.id.includes(query)),...regulations.filter(r=>r.title.toLowerCase().includes(query.toLowerCase())),...scenarios.filter(s=>s.title.toLowerCase().includes(query.toLowerCase()))]
  return <div className="flex min-h-screen"><aside className="w-64 bg-sigma-900 text-white p-4 space-y-3"><h1 className="text-xl font-bold">Сигма</h1>{nav.map(([to,label])=><NavLink key={to} to={to} className={({isActive})=>`block px-3 py-2 rounded ${isActive?'bg-sigma-600':'hover:bg-slate-700'}`}>{label}</NavLink>)}<NavLink to="/resources" className="block px-3 py-2 rounded hover:bg-slate-700">Ресурсы</NavLink></aside>
  <main className="flex-1 p-4 space-y-4"><header className="bg-white rounded-xl p-3 flex items-center justify-between gap-4"><div className="flex items-center gap-2 bg-slate-100 rounded px-3 py-2 w-[420px]"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Спросите Сигму" className="bg-transparent outline-none w-full" onFocus={()=>setOpen(true)} /></div><div className="text-sm text-slate-600">Обновлено {formatDistanceToNow(new Date(),{locale:ru,addSuffix:true})}</div><button className="relative"><Bell/><span className="absolute -right-2 -top-2 bg-red-600 text-white text-xs rounded-full px-1">{notifications.length}</span></button></header>
  {open&&query&&<div className="bg-white rounded-xl p-3"><div className="font-semibold mb-2">Результаты поиска</div>{found.slice(0,6).map((f)=><div key={f.id ?? f.code} className="border-b py-1 text-sm">{f.title ?? f.name}</div>)}<button onClick={()=>setOpen(false)} className="text-blue-600 text-sm mt-2">Закрыть</button></div>}
  <Outlet/></main></div>
}
