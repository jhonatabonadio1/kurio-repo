# Kurio — NFT Marketplace

Frontend challenge: discovery, purchase and collector account flows of an NFT marketplace, desktop and mobile, built from the Figma file. All APIs, wallets, payments and real-time events are simulated with MSW, in the browser.

**Stack:** React 19 + TypeScript · TanStack Router · TanStack Query · Axios (REST) · socket.io-client · Tailwind CSS 4 + shadcn/ui · MSW 2 + `@mswjs/socket.io-binding` · Playwright · Lighthouse.

How it is built (contracts, events, session, cart, cache, reconciliation, Figma deviations): **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Setup

Requires **Node ≥ 20.19** and **pnpm 10** (`corepack enable`).

```bash
pnpm install
cp .env.example .env     # optional: the defaults below are the same
pnpm dev                 # http://localhost:5173 (mocks on)
```

No backend or private service is needed: a clean checkout runs as is.

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_MOCKING` | `enabled` | Starts MSW (REST + Socket.IO) in the browser. Keep it on for dev, the demo build and the tests. |
| `VITE_API_URL` | `/api` | Base URL for Axios. |
| `VITE_SOCKET_URL` | page origin | Socket.IO origin. |

## Test accounts and coupons (fictional)

| E-mail | Password | Has |
| --- | --- | --- |
| `alice@test.dev` | `Test@1234` | primary + secondary wallet, 1 favorite |
| `bruno@test.dev` | `Test@1234` | one wallet |

You can also create an account at `/register` (any e-mail, password with letters and numbers, 8+ chars).

Coupons: `WELCOME10` (−10%), `KURIO25` (−25%), `OLD20` (expired). Anything else is invalid.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with mocks (5173) |
| `pnpm build` | Type check + production build (mocks included) |
| `pnpm preview` | Serves the build on 4173 |
| `pnpm typecheck` | `tsc` without emitting |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright (builds and serves the app itself) |
| `pnpm test:e2e:report` | Opens the last HTML report |
| `pnpm test:e2e:update` | Rewrites the visual baselines (see below) |
| `pnpm lighthouse` | Lighthouse audit (needs `pnpm build && pnpm preview` running) |
| `pnpm verify:mocks` | 102 checks of the mock API in Node |
| `pnpm verify:realtime` | 11 checks of the event rules (duplicates, old versions, other users) |
| `pnpm verify:socket` | Socket.IO mock transport check (~35 s) |

## Mock scenarios

One scenario is active per tab. Choose it in any of these ways:

- **URL:** add `?scenario=<name>` (and optionally `&latency=<ms>`) to any page, e.g. `/?scenario=slow`. It is kept for the tab (sessionStorage) until you pick another.
- **Demo panel:** the small **"Simulação"** button at the bottom left opens a panel with every scenario, the latency, data reset and Socket.IO event buttons.
- **Tests:** `test.use({ scenario: 'slow' })` or `mocks.setScenario()` (`e2e/fixtures.ts`).

**Reset:** add `?reset=1` to any URL (e.g. `/?reset=1` or `/?reset=1&scenario=flaky`), or use "Restaurar dados" in the panel. It restores the seed data, signs out, clears the guest cart and the checkout draft, and goes back to the default scenario (unless one is given).

| Scenario | What happens |
| --- | --- |
| `default` | Normal data, 150–400 ms latency |
| `empty` | The catalog has no results |
| `slow` | 2.5 s on every request (skeletons) |
| `out-of-order` | Old catalog searches answer after the new ones |
| `flaky` | The first call of each route fails with 503; the retry works |
| `offline` | No connection on every request |
| `server-error` | 500 on the catalog and the detail |
| `session-expired` | The session expires after a few requests |
| `forbidden` | Another user's order answers 403 |
| `register-conflict` | Sign-up always answers "e-mail already used" (409) |
| `price-change` | A cart item's price changes 4 s after the checkout quote |
| `sold-out` | The edition sells out between the quote and the order |
| `order-timeout` | The order is created but its answer never arrives (idempotency) |
| `payment-confirmed` | Payment confirmed after a few seconds |
| `payment-rejected` | Payment refused after a few seconds |
| `favorite-error` | Favoriting fails with 500 (the optimistic update rolls back) |
| `profile-conflict` | Profile changed in another tab: the first save answers 409 |

## Reproducing the failure flows

Sign in as `alice@test.dev` / `Test@1234` where a step needs it.

| Flow | Steps |
| --- | --- |
| Skeletons, error and retry | `/?scenario=slow` → skeletons with shimmer. `/?scenario=server-error` → error + "Tentar novamente"; switch to `default` in the panel and retry. `/?scenario=offline` → "Sem conexão". |
| Responses out of order | `/?scenario=out-of-order`, type a search, change it quickly: the newest one always wins. |
| Session expiry | `/?scenario=session-expired`, sign in, open a few pages → login with "Sua sessão expirou", then back to the same page. |
| Sign-up conflict | `/register` with `alice@test.dev`, or `/register?scenario=register-conflict` with any e-mail. |
| Coupon | Cart → `NOPE` (invalid), `OLD20` (expired), `WELCOME10` (applied). |
| Price/stock change during checkout | Add an NFT, open `/checkout`, then "Preço +10%" or "Esgotar edição" in the panel (or use `/checkout?scenario=price-change` and wait 4 s) → "Os valores mudaram"; "Confirmar compra" waits for "Aceitar os novos valores". |
| Sold out at order time | `/checkout?scenario=sold-out` → confirm → "Sem estoque suficiente", nothing is bought. |
| Lost order answer | `/checkout?scenario=order-timeout` → confirm and pay. After the client timeout (8 s) the same order is recovered with the same idempotency key (or refresh the page: it is recovered on load). Only one order exists. |
| Payment refused | `/checkout?scenario=payment-rejected` → "Pagamento recusado"; the cart keeps the items. |
| Socket drop while pending | Confirm a purchase, then "Derrubar conexão em tempo real" in the panel: "Reconectando…", then the order settles via polling/reconnect; refresh at any time, no second order. |
| Favorite rollback | `/nfts/emerald-ape-042?scenario=favorite-error` → the heart turns back and a message explains it. |
| Profile conflict | `/profile?scenario=profile-conflict` → change a field, save → 409 + "Carregar dados atuais". |
| Wallet validation | `/profile/wallets` → empty name, short referral code, or the primary address on the secondary wallet (409). |

## End-to-end tests (Playwright)

```bash
pnpm exec playwright install chromium   # once
pnpm test:e2e                           # builds, serves on 4173, runs desktop (1440) + mobile (390)
pnpm test:e2e:report                    # HTML report; traces are kept for failed tests
```

- Specs map to the brief §9 list: `e2e/01-catalog` … `e2e/12-loading-errors`, plus `e2e/visual.spec.ts` (home, detail, cart and checkout screenshots).
- Every test runs in its own browser context (clean storage = the seed). REST goes through the MSW handlers; real-time tests emit events through the mock Socket.IO server and the app receives them with `socket.io-client`.
- `E2E_BASE_URL=http://localhost:5173 pnpm test:e2e` runs against an already running server instead.
- **Visual baselines** (`e2e/__screenshots__`) were rendered on Linux. Font rendering differs per OS, so on macOS/Windows run the visual spec in the Playwright image:

  ```bash
  docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.64.1-noble \
    bash -c "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e e2e/visual.spec.ts"
  ```

  Add `--update-snapshots` after an intended visual change.

## Lighthouse

```bash
pnpm build && pnpm preview      # terminal 1
pnpm lighthouse                 # terminal 2 — home and detail, mobile and desktop, 3 runs each
```

Config: `lighthouse/lighthouse.config.mjs`. Reports (HTML + JSON for every run), medians, tool versions and conditions: `lighthouse/reports/` (`summary.md`). Latest medians:

| Page | Profile | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | mobile | **65** ⚠ | 100 | 100 | 100 | 4.6 s | 0 | 374 ms |
| home | desktop | 97 | 100 | 100 | 100 | 1.0 s | 0 | 0 ms |
| detail | mobile | **70** ⚠ | 100 | 100 | 100 | 4.4 s | 0 | 276 ms |
| detail | desktop | 98 | 100 | 100 | 100 | 0.9 s | 0 | 19 ms |

Median of 3 runs, Lighthouse 12.8.2, Chrome 153, production build with mocks (environment in `summary.md`).

The mobile Performance score and its causes are explained in [ARCHITECTURE.md › Performance](./ARCHITECTURE.md#performance).

## Deploy

Vercel, Vite preset (`vercel.json`): build `pnpm build`, output `dist`, `VITE_API_MOCKING=enabled`. Every route is rewritten to `index.html`, so direct links and refresh work; `mockServiceWorker.js` is served with `Cache-Control: no-cache`.
