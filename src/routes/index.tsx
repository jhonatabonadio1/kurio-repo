import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { HealthSchema, SystemWelcomeSchema } from '@/contracts/system'
import { getParsed } from '@/shared/api/client'
import { createSocket } from '@/shared/realtime/socket'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

// Day-1 spike page: proves Router + Query + Axios + MSW (REST) and
// socket.io-client + MSW (real-time). The real home replaces it next.
export const Route = createFileRoute('/')({
  component: StackCheckPage,
})

type SocketState =
  | { status: 'connecting' }
  | { status: 'connected'; connectionId: string; roundTripMs: number; reconnects: number }
  | { status: 'error'; message: string }

function useSocketCheck() {
  const [state, setState] = useState<SocketState>({ status: 'connecting' })

  useEffect(() => {
    let cancelled = false
    let cleanup = () => {}
    let reconnects = 0

    createSocket().then((socket) => {
      if (cancelled) return
      const sayHello = () => socket.emit('system.hello', { sentAt: Date.now() })
      const onWelcome = (raw: unknown) => {
        const welcome = SystemWelcomeSchema.parse(raw)
        setState({
          status: 'connected',
          connectionId: welcome.connectionId,
          roundTripMs: welcome.echoedSentAt ? Date.now() - welcome.echoedSentAt : 0,
          reconnects,
        })
      }
      const onError = (error: Error) => setState({ status: 'error', message: error.message })
      const onReconnect = () => {
        reconnects += 1
      }

      socket.on('connect', sayHello)
      socket.on('system.welcome', onWelcome)
      socket.on('connect_error', onError)
      socket.io.on('reconnect', onReconnect)
      socket.connect()

      // Release listeners and the connection when the page unmounts.
      cleanup = () => {
        socket.off('connect', sayHello)
        socket.off('system.welcome', onWelcome)
        socket.off('connect_error', onError)
        socket.io.off('reconnect', onReconnect)
        socket.disconnect()
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return state
}

function StackCheckPage() {
  const health = useQuery({
    queryKey: ['system', 'health'],
    queryFn: ({ signal }) => getParsed('/health', HealthSchema, { signal }),
  })
  const socket = useSocketCheck()

  return (
    <section aria-labelledby="stack-title" className="max-w-2xl">
      <p className="text-sm text-text-secondary">Bem-vindo à Kurio</p>
      <h1 id="stack-title" className="mt-2 text-3xl font-bold uppercase md:text-display">
        Verificação da stack
      </h1>
      <p className="mt-4 text-sm leading-6 text-text-secondary">
        REST via Axios + TanStack Query e tempo real via socket.io-client, ambos atendidos pelo MSW.
      </p>

      <dl className="mt-10 grid gap-4 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-lg bg-card p-5">
          <dt className="text-sm font-bold">API mock (REST)</dt>
          <dd className="mt-3 min-h-10 text-sm text-text-secondary">
            {health.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : health.isError ? (
              <span className="text-destructive">Falhou: {health.error.message}</span>
            ) : (
              <>
                <span className="font-bold text-success">● OK</span> · cenário {health.data.scenario}
              </>
            )}
          </dd>
        </div>

        <div className="rounded-lg bg-card p-5">
          <dt className="text-sm font-bold">Socket.IO (tempo real)</dt>
          <dd className="mt-3 min-h-10 text-sm text-text-secondary">
            {socket.status === 'connecting' ? (
              <Skeleton className="h-10 w-full" />
            ) : socket.status === 'error' ? (
              <span className="text-destructive">Falhou: {socket.message}</span>
            ) : (
              <>
                <span className="font-bold text-success">● Conectado</span> · {socket.connectionId} · ida e
                volta {socket.roundTripMs} ms · reconexões {socket.reconnects}
              </>
            )}
          </dd>
        </div>
      </dl>

      <Button className="mt-8" onClick={() => void health.refetch()}>
        TESTAR DE NOVO
      </Button>
    </section>
  )
}
