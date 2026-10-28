import type { ReactNode } from 'react'

export function AccountSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-lg bg-card p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-base leading-5 font-bold">
          {title}
        </h2>
        {description && <p className="text-sm leading-6 text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  )
}
