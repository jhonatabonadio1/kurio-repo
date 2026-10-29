import { FlaskConical, X } from 'lucide-react'
import * as React from 'react'
import { createRoot } from 'react-dom/client'

import { eth } from '@/shared/money/eth'

import { getMockConfig, SCENARIOS, setMockConfig, type Scenario } from '../config'
import { db } from '../db/store'
import { guestOwnerKey, userOwnerKey } from '../lib/cart'
import { disconnectAllSockets } from '../realtime'
import { changeEditionPrice, changeEditionStock } from '../scenarios/price-change'

/**
 * Demo-only control panel (mock layer, own React root): pick a scenario and
 * latency, restore the seed, and fire Socket.IO events through the mock
 * server. The same controls exist for tests as /__mocks/* routes.
 */
export function mountScenarioPanel() {
  const host = document.createElement('div')
  host.id = 'kurio-mock-panel'
  document.body.appendChild(host)
  createRoot(host).render(<ScenarioPanel />)
}

/** The cart the visitor sees now: the signed-in user's, else the guest one. */
function activeCartLine() {
  let owner: string | null = null
  try {
    const session = JSON.parse(localStorage.getItem('kurio-session') ?? 'null') as { userId?: string } | null
    const guest = localStorage.getItem('kurio-cart-token')
    owner = session?.userId ? userOwnerKey(session.userId) : guest ? guestOwnerKey(guest) : null
  } catch {
    owner = null
  }
  return owner ? db.read((s) => s.carts[owner]?.lines[0] ?? null) : null
}

const button = 'rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:border-primary hover:text-text-accent disabled:opacity-50'

function ScenarioPanel() {
  const [open, setOpen] = React.useState(false)
  const current = getMockConfig()
  const [scenario, setScenario] = React.useState<Scenario>(current.scenario)
  const [latency, setLatency] = React.useState(current.latencyMs === null ? '' : String(current.latencyMs))
  const [message, setMessage] = React.useState('')

  const apply = () => {
    setMockConfig({ scenario, latencyMs: latency === '' ? null : Math.max(0, Number(latency) || 0) })
    window.location.reload()
  }
  const reset = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('reset', '1')
    window.location.assign(url.href)
  }
  const onCartLine = (run: (line: { nftId: string; editionId: string }) => void, done: string) => {
    const line = activeCartLine()
    if (!line) return setMessage('Adicione um NFT ao carrinho primeiro.')
    run(line)
    setMessage(done)
  }

  return (
    <div className="fixed bottom-24 left-3 z-[70] md:bottom-4">
      {open ? (
        <section
          role="dialog"
          aria-label="Cenários da simulação"
          className="flex w-[300px] max-w-[calc(100vw-24px)] flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Simulação (MSW)</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar painel de simulação" className="text-text-secondary hover:text-foreground">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Cenário
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              className="h-9 rounded-md border border-border bg-transparent px-2 text-xs font-normal"
            >
              {Object.entries(SCENARIOS).map(([value, label]) => (
                <option key={value} value={value} className="bg-card">
                  {value} — {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Latência fixa (ms, vazio = 150–400 aleatória)
            <input
              inputMode="numeric"
              value={latency}
              onChange={(e) => setLatency(e.target.value.replace(/\D/g, ''))}
              className="h-9 rounded-md border border-border bg-transparent px-2 text-xs font-normal"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={button} onClick={apply}>
              Aplicar e recarregar
            </button>
            <button type="button" className={button} onClick={reset}>
              Restaurar dados
            </button>
          </div>
          <p className="text-xs font-bold">Eventos Socket.IO (1º item do carrinho)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={button}
              onClick={() => onCartLine((l) => changeEditionPrice(l.nftId, l.editionId, (p) => eth.of(Number(eth.mul(p, 1.1)).toFixed(2))), 'nft.updated: preço +10%.')}
            >
              Preço +10%
            </button>
            <button type="button" className={button} onClick={() => onCartLine((l) => changeEditionStock(l.nftId, l.editionId, 0), 'nft.updated: edição esgotada.')}>
              Esgotar edição
            </button>
            <button
              type="button"
              className={`${button} col-span-2`}
              onClick={() => {
                disconnectAllSockets()
                setMessage('Socket desconectado; o cliente reconecta e reconcilia com a API.')
              }}
            >
              Derrubar conexão em tempo real
            </button>
          </div>
          <p role="status" className="min-h-4 text-xs text-text-accent">
            {message}
          </p>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-2 text-xs shadow-lg hover:border-primary"
          aria-label={`Simulação: cenário ${current.scenario}`}
        >
          <FlaskConical className="size-3.5 text-text-accent" aria-hidden />
          <span aria-hidden>{current.scenario === 'default' ? 'Simulação' : current.scenario}</span>
        </button>
      )}
    </div>
  )
}
