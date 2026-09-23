import type { ReactNode } from 'react'

type Tone = 'info' | 'warning' | 'error'

const tones: Record<Tone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-950',
  warning: 'border-amber-400 bg-amber-50 text-amber-950',
  error: 'border-red-400 bg-red-50 text-red-950',
}

export default function Notice({ tone = 'info', title, children, action }: { tone?: Tone; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
