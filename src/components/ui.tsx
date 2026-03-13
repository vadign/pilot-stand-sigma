import type { ReactNode } from 'react'
export const Card = ({children,className=''}:{children:ReactNode,className?:string})=><div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>{children}</div>
export const Badge = ({text}:{text:string})=><span className="px-2 py-1 rounded-full bg-slate-100 text-xs">{text}</span>
