import { Bell, Building2, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSigmaStore } from '../store/useSigmaStore'

const nav = [
  ['/mayor-dashboard', 'Панель мэра'],
  ['/briefing', 'Управленческий бриф'],
  ['/operations', 'Оперативный монитор'],
  ['/incidents/INC-1000', 'Карточка инцидента'],
  ['/history', 'История и аналитика'],
  ['/scenarios', 'Сценарии и прогнозы'],
  ['/deputies', 'Цифровые заместители'],
  ['/regulations', 'Реестр регламентов'],
]

export function Layout() {
  const notifications = useSigmaStore((s) => s.notifications)
  const incidents = useSigmaStore((s) => s.incidents)
  const regulations = useSigmaStore((s) => s.regulations)
  const scenarios = useSigmaStore((s) => s.scenarios)
  const bump = useSigmaStore((s) => s.bumpLive)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setInterval(() => bump(), 12000)
    return () => clearInterval(timer)
  }, [bump])

  const found = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return [
      ...incidents.filter((i) => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)).map((i) => ({ id: i.id, title: i.title })),
      ...regulations.filter((r) => r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)).map((r) => ({ id: r.id, title: r.title })),
      ...scenarios.filter((s) => s.title.toLowerCase().includes(q)).map((s) => ({ id: s.id, title: s.title })),
    ].slice(0, 8)
  }, [incidents, query, regulations, scenarios])

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="w-72 border-r border-slate-200 bg-white p-5">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-3xl font-bold">Сигма City</div>
            <div className="text-sm text-slate-500">Кабинет руководителя</div>
            <div className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Ветка redesign-from-scratch</div>
          </div>
        </div>

        <nav className="space-y-1.5">
          {nav.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2.5 text-[16px] font-medium transition ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
              <Search size={18} className="text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Спросите Сигму: инцидент, район, регламент, сценарий"
                className="w-full bg-transparent text-[15px] outline-none"
              />
            </div>
            <div className="text-sm text-slate-500">Обновлено {formatDistanceToNow(new Date(), { locale: ru, addSuffix: true })}</div>
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5">
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{notifications.length}</span>
            </button>
          </div>
          {query && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
              {found.length === 0 ? (
                <div className="px-2 py-1 text-sm text-slate-500">Ничего не найдено</div>
              ) : (
                found.map((item) => (
                  <div key={item.id} className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100">
                    {item.title}
                  </div>
                ))
              )}
            </div>
          )}
        </header>
        <Outlet />
      </main>
    </div>
  )
}
