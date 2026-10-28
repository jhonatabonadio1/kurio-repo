/**
 * Mock scenarios: one active at a time, chosen by URL (?scenario=slow),
 * by the dev panel, or by Playwright before the page loads. Saved in
 * sessionStorage so it survives refresh within the tab.
 */
export const SCENARIOS = {
  default: 'Dados normais, latência de 150–400 ms',
  empty: 'Catálogo sem resultados',
  slow: '2,5 s em todas as requisições (skeletons)',
  'out-of-order': 'Buscas antigas respondem depois das novas',
  flaky: 'Primeira chamada de cada rota falha com 503; a nova tentativa funciona',
  offline: 'Sem conexão em todas as requisições',
  'server-error': 'Erro 500 no catálogo e no detalhe',
  'session-expired': 'A sessão expira após algumas requisições',
  forbidden: 'Pedido de outro usuário retorna 403',
  'register-conflict': 'Cadastro sempre retorna e-mail já usado (409)',
  'price-change': 'Preço de um item do carrinho muda durante o checkout',
  'sold-out': 'Edição esgota entre a cotação e o pedido',
  'order-timeout': 'Pedido é criado, mas a resposta não chega (idempotência)',
  'payment-confirmed': 'Pagamento confirmado após alguns segundos',
  'payment-rejected': 'Pagamento recusado após alguns segundos',
  'favorite-error': 'Favoritar falha com 500 (desfaz a atualização otimista)',
} as const
export type Scenario = keyof typeof SCENARIOS
export const isScenario = (value: unknown): value is Scenario =>
  typeof value === 'string' && value in SCENARIOS

export type MockConfig = {
  scenario: Scenario
  /** Fixed latency for every request; null = seeded 150–400 ms. Tests use 0. */
  latencyMs: number | null
}

const STORAGE_KEY = 'kurio-mock-config'
const DEFAULT_CONFIG: MockConfig = { scenario: 'default', latencyMs: null }

const session = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function load(): MockConfig {
  try {
    const raw = session()?.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockConfig>
      return {
        scenario: isScenario(parsed.scenario) ? parsed.scenario : 'default',
        latencyMs: typeof parsed.latencyMs === 'number' ? parsed.latencyMs : null,
      }
    }
  } catch {
    // ignore and use the default
  }
  return { ...DEFAULT_CONFIG }
}

let config = load()
const listeners = new Set<(c: MockConfig) => void>()

export function getMockConfig(): Readonly<MockConfig> {
  return config
}

export function setMockConfig(next: Partial<MockConfig>) {
  config = { ...config, ...next }
  session()?.setItem(STORAGE_KEY, JSON.stringify(config))
  for (const listener of listeners) listener(config)
}

export function onMockConfigChange(listener: (c: MockConfig) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Reads ?scenario=…&latency=… once at boot. */
export function applyConfigFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const scenario = params.get('scenario')
  const latency = params.get('latency')
  const next: Partial<MockConfig> = {}
  if (isScenario(scenario)) next.scenario = scenario
  if (latency !== null && /^\d+$/.test(latency)) next.latencyMs = Number(latency)
  if (Object.keys(next).length) setMockConfig(next)
}
