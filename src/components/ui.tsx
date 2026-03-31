import { useEffect, useState, type ReactNode } from 'react'
import { formatSourceStatusLabel, formatSourceTypeLabel } from '../lib/sourcePresentation'

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>
)

export const CollapsibleCardSection = ({
  title,
  summary,
  mobile,
  defaultOpen = false,
  children,
  className = '',
  contentClassName = '',
  titleClassName = 'text-2xl font-bold',
}: {
  title: string
  summary?: string
  mobile: boolean
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  contentClassName?: string
  titleClassName?: string
}) => {
  const [isOpen, setIsOpen] = useState(() => !mobile || defaultOpen)

  useEffect(() => {
    setIsOpen(!mobile || defaultOpen)
  }, [defaultOpen, mobile])

  return (
    <Card className={className}>
      {mobile ? (
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <div className={titleClassName}>{title}</div>
            {summary && <div className="mt-1 text-sm text-slate-500">{summary}</div>}
          </div>
          <span className="shrink-0 text-sm font-semibold text-blue-700">
            {isOpen ? 'Скрыть' : 'Показать'}
          </span>
        </button>
      ) : (
        <div className="mb-3">
          <div className={titleClassName}>{title}</div>
          {summary && <div className="mt-1 text-sm text-slate-500">{summary}</div>}
        </div>
      )}
      {isOpen && <div className={`${mobile ? 'mt-4' : ''} ${contentClassName}`.trim()}>{children}</div>}
    </Card>
  )
}

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

export const MetaGrid = ({ items, className = '' }: { items: Array<{ label: string; value: ReactNode }>; className?: string }) => (
  <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${className}`}>
    {items.map((item) => (
      <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <div className="text-slate-500">{item.label}</div>
        <div className="font-semibold text-slate-900">{item.value}</div>
      </div>
    ))}
  </div>
)

export const SourceMetaFooter = ({
  source,
  updatedAt,
  ttl,
  type,
  status,
}: {
  source: string
  updatedAt?: string
  ttl: string
  type: string
  status: string
}) => (
  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
    <div className="grid gap-2 sm:grid-cols-4">
      <div><span className="font-semibold text-slate-900">Источник:</span> {source}</div>
      <div><span className="font-semibold text-slate-900">Обновлено:</span> {updatedAt ? new Date(updatedAt).toLocaleString('ru-RU') : '—'}</div>
      <div><span className="font-semibold text-slate-900">Период обновления:</span> {ttl}</div>
      <div>
        <span className="font-semibold text-slate-900">Характер сведений:</span>{' '}
        {formatSourceTypeLabel(type)} · {formatSourceStatusLabel(status)}
      </div>
    </div>
  </div>
)
