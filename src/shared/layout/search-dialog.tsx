import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

/** Header search: submits to the catalog as ?q=… (first page). */
export function SearchDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const navigate = useNavigate()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const q = term.trim()
    setOpen(false)
    void navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: 'catalogo' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Por nome, coleção, criador ou ID do token.</DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={submit} className="flex gap-2">
          <label htmlFor="header-search" className="sr-only">
            Termo de busca
          </label>
          <div className="flex h-10 flex-1 items-center gap-2 rounded-md bg-surface-dark px-3">
            <Search className="size-4 text-text-secondary" aria-hidden />
            <input
              id="header-search"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              maxLength={60}
              placeholder="Explorar coleções"
              className="h-full w-full bg-transparent text-sm placeholder:text-brand-secondary focus:outline-none"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
