import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * Small toast system. Every message is also read by screen readers:
 * "info"/"success" politely, "error" assertively. Used for mutation
 * results and real-time changes.
 */
type Tone = 'info' | 'success' | 'error'
type Toast = { id: number; message: string; tone: Tone }

let nextId = 1
const listeners = new Set<(toast: Toast) => void>()

export function toast(message: string, tone: Tone = 'info') {
  const item = { id: nextId++, message, tone }
  listeners.forEach((listener) => listener(item))
}

const ICONS = { info: Info, success: CheckCircle2, error: TriangleAlert }

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([])

  React.useEffect(() => {
    const add = (item: Toast) => {
      setItems((prev) => [...prev.slice(-3), item])
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== item.id)), item.tone === 'error' ? 8_000 : 5_000)
    }
    listeners.add(add)
    return () => void listeners.delete(add)
  }, [])

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id))

  return (
    <>
      {/* Live regions exist before any message, so screen readers pick them up. */}
      <div className="sr-only" aria-live="polite">
        {items.filter((t) => t.tone !== 'error').map((t) => <p key={t.id}>{t.message}</p>)}
      </div>
      <div className="sr-only" aria-live="assertive">
        {items.filter((t) => t.tone === 'error').map((t) => <p key={t.id}>{t.message}</p>)}
      </div>
      <ol
        aria-hidden
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 md:right-6 md:bottom-6 md:left-auto md:items-end"
      >
        {items.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <li
              key={t.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-card p-4 text-sm leading-5 shadow-2xl',
                t.tone === 'error' ? 'border-destructive/60' : t.tone === 'success' ? 'border-success/50' : 'border-border-soft',
              )}
            >
              <Icon
                className={cn('mt-0.5 size-4 shrink-0', t.tone === 'error' ? 'text-destructive' : t.tone === 'success' ? 'text-success' : 'text-text-accent')}
              />
              <p className="flex-1">{t.message}</p>
              <button type="button" tabIndex={-1} onClick={() => dismiss(t.id)} className="text-text-secondary hover:text-foreground">
                <X className="size-4" />
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
