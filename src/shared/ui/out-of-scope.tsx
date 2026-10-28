import * as React from 'react'

import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'

/**
 * Editorial pages, support, activity, offers, downloads, social links and
 * similar actions are drawn in the Figma but are not part of the challenge.
 * They open this dialog instead of pretending to work.
 */
const OutOfScopeContext = React.createContext<(feature: string) => void>(() => {})

export function OutOfScopeProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = React.useState<string | null>(null)
  return (
    <OutOfScopeContext.Provider value={setFeature}>
      {children}
      <Dialog open={feature !== null} onOpenChange={(open) => !open && setFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Indisponível nesta demonstração</DialogTitle>
            <DialogDescription>
              {feature ? `“${feature}” ` : 'Este recurso '}não faz parte desta versão do marketplace. Nenhuma ação foi
              realizada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFeature(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OutOfScopeContext.Provider>
  )
}

export const useOutOfScope = () => React.useContext(OutOfScopeContext)

/** A button that looks like a link and opens the out-of-scope dialog. */
export function OutOfScopeLink({
  feature,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onClick'> & { feature: string }) {
  const open = useOutOfScope()
  return (
    <button type="button" className={className} onClick={() => open(feature)} {...props}>
      {children}
    </button>
  )
}
