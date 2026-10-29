import { test as base, expect, type Locator, type Page } from '@playwright/test'

import type { Scenario } from '../src/mocks/config'

/** Fictional accounts from src/mocks/fixtures/accounts.ts. */
export const USERS = {
  alice: { email: 'alice@test.dev', password: 'Test@1234', displayName: 'Alice Martins', username: 'alice' },
  bruno: { email: 'bruno@test.dev', password: 'Test@1234', displayName: 'Bruno Costa', username: 'bruno' },
} as const
export type UserKey = keyof typeof USERS
/** Edition slug used in the detail URL (?edicao=1-10). */
export type EditionSlug = '1-1' | '1-10' | '1-50' | 'aberta'

type EmitCommand =
  | { kind: 'nft-price'; nftId: string; editionId: string; price: string }
  | { kind: 'nft-stock'; nftId: string; editionId: string; available: number }
  | { kind: 'replay'; index?: number }
  | { kind: 'disconnect' }

/**
 * Talks to the mock control routes (/__mocks/*). They run inside the page,
 * through the MSW service worker, so the page must be open first.
 */
export class Mocks {
  constructor(private readonly page: Page) {}

  private async post<T>(path: string, body?: unknown): Promise<T> {
    // The app renders only after the MSW worker started (src/main.tsx).
    await this.page.locator('#conteudo').waitFor({ state: 'attached' })
    return this.page.evaluate(
      async ([url, payload]) => {
        const res = await fetch(url as string, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload ?? {}),
        })
        return res.json()
      },
      [path, body] as const,
    ) as Promise<T>
  }

  /** Switches scenario (and optionally latency) without reloading. */
  setScenario(scenario: Scenario, latencyMs?: number | null) {
    return this.post('/__mocks/config', latencyMs === undefined ? { scenario } : { scenario, latencyMs })
  }

  /** Waits until the app's socket.io-client is connected to the mock server. */
  async connected() {
    await expect(this.page.locator('html')).toHaveAttribute('data-realtime', 'connected')
  }

  /** Sends a Socket.IO event through the mock server (the app's socket.io-client receives it). */
  async emit(command: EmitCommand) {
    if (command.kind !== 'disconnect') await this.connected()
    return this.post<{ ok: boolean; event?: unknown }>('/__mocks/emit', command)
  }

  reset() {
    return this.post('/__mocks/reset')
  }

  /** Mock server state (read-only view of what the API holds). */
  async db<T = MockDb>(): Promise<T> {
    await this.page.locator('#conteudo').waitFor({ state: 'attached' })
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('kurio-mock-db') ?? '{}'))
  }
}

export type MockDb = {
  orders: Record<string, { id: string; userId: string; status: string; receipt: { total: string } }>
  favorites: Record<string, string[]>
  carts: Record<string, { lines: { nftId: string; editionId: string; quantity: number }[] }>
}

type Fixtures = {
  /** Scenario active when the tab opens (test.use({ scenario: 'slow' })). */
  scenario: Scenario
  /** Fixed mock latency in ms; 0 keeps tests fast and deterministic. null = seeded 150–400 ms. */
  latency: number | null
  mocks: Mocks
  /** True on the mobile project (390 px): the app shows the mobile frames. */
  mobile: boolean
}

export const test = base.extend<Fixtures>({
  scenario: ['default', { option: true }],
  latency: [0, { option: true }],

  // Each test has its own browser context, so localStorage (mock DB, cart,
  // session) starts empty = the seed. The config is written once per tab, so
  // a mid-test setScenario() survives reloads.
  page: async ({ page, scenario, latency }, use) => {
    await page.addInitScript(
      ([s, l]) => {
        if (sessionStorage.getItem('e2e-config')) return
        sessionStorage.setItem('kurio-mock-config', JSON.stringify({ scenario: s, latencyMs: l }))
        sessionStorage.setItem('e2e-config', '1')
      },
      [scenario, latency] as const,
    )
    await use(page)
  },

  mocks: async ({ page }, use) => {
    await use(new Mocks(page))
  },

  mobile: async ({ viewport }, use) => {
    await use((viewport?.width ?? 1440) < 768)
  },
})

export { expect }
export type { Page }

// ---------- Flow helpers (they use the UI, like a user) ----------

export async function login(page: Page, user: UserKey = 'alice', { from = '/login' } = {}) {
  if (from) await page.goto(from)
  const { email, password } = USERS[user]
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.locator('form button[type=submit]').click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function register(page: Page, username: string, password = 'Senha1234') {
  await page.goto('/register')
  await page.getByLabel('Nome de usuário').fill(username)
  await page.getByLabel('E-mail').fill(`${username}@test.dev`)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.locator('form button[type=submit]').click()
}

/** Opens the NFT page (edition and quantity come from the URL, like a shared link) and adds it to the cart. */
export async function addToCart(page: Page, mobile: boolean, nftId: string, { edition, qty }: { edition?: EditionSlug; qty?: number } = {}) {
  const search = new URLSearchParams()
  if (edition) search.set('edicao', edition)
  if (qty && qty > 1) search.set('qtd', String(qty))
  await page.goto(`/nfts/${nftId}${search.size ? `?${search}` : ''}`)
  // Mobile: round cart button (stays). Desktop: COMPRAR (adds and opens the cart).
  if (mobile) await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  else await page.getByRole('button', { name: 'COMPRAR', exact: true }).click()
  await expect(page.getByText(/adicionado ao carrinho/).first()).toBeAttached()
}

export function cartLink(page: Page): Locator {
  return page.getByRole('link', { name: /^Carrinho/ }).first()
}

/** Checkout: connect the simulated wallet (approve), review, then pay. */
export async function confirmPurchase(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const approve = page.getByRole('button', { name: 'Aprovar conexão' })
  const review = page.getByRole('heading', { name: 'Revise o pedido' })
  await expect(approve.or(review)).toBeVisible()
  if (await approve.isVisible()) await approve.click()
  await expect(review).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
}

/** Waits until the checkout has its quote and the main button is enabled. */
export async function checkoutReady(page: Page) {
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
}
