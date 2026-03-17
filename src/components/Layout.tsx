import { Bell, Building2, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSigmaStore } from '../store/useSigmaStore'
import { AskSigmaBar } from '../features/ask-sigma/AskSigmaBar'
import { AnswerPanel } from '../features/ask-sigma/rendering/AnswerPanel'

const nav = [
  ['/mayor-dashboard', 'Панель мэра'],
  ['/briefing', 'Управленческий бриф'],
  ['/history', 'История и аналитика'],
]

export function Layout() {
  const notifications = useSigmaStore((s) => s.notifications)
  const bump = useSigmaStore((s) => s.bumpLive)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => bump(), 12000)
    return () => clearInterval(timer)
  }, [bump])

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row">
      <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-3xl font-bold">Сигма City</div>
            <div className="text-sm text-slate-500">Кабинет руководителя</div>
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

      <main className="flex-1 p-3 sm:p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            Разделы
          </button>
          <button className="relative rounded-xl border border-slate-200 bg-white p-2.5">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{notifications.length}</span>
          </button>
        </div>

        {mobileNavOpen && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
            <nav className="space-y-1.5">
              {nav.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <AskSigmaBar />
        <Outlet />
        <AnswerPanel />
      </main>
    </div>
  )
}
