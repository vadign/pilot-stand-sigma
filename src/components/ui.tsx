import type { ReactNode } from 'react'

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>
)

export const Badge = ({ text, className = '' }: { text: string; className?: string }) => (
  <span className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${className}`}>
    {text}
  </span>
)

export const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
    {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
  </div>
)
