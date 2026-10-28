import type { ReactNode } from 'react'

/** Numbered checkout block with a heading the review step can focus. */
export function CheckoutSection({ step, title, id, children, aside }: { step: number; title: string; id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-lg bg-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="flex items-center gap-3 text-base leading-4 font-bold">
          <span aria-hidden className="grid size-7 place-items-center rounded-full bg-primary text-sm text-ink">
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
