# Architecture

How the Kurio marketplace is built, the contracts it uses, and the decisions behind it. Setup and commands are in `README.md`.

## Stack and versions

| Area | Choice |
| --- | --- |
| Build | Vite 8, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`) |
| Routing | TanStack Router, file-based, `autoCodeSplitting` |
| Server state | TanStack Query 5 |
| HTTP | Axios, one instance (`src/shared/api/client.ts`) |
| Real time | socket.io-client 4.8 |
| Mocks | MSW 2.15 + `@mswjs/socket.io-binding` 0.2 |
| UI | Tailwind CSS 4 + shadcn/ui (new-york), self-hosted Roboto Mono |

**Version pins:** MSW stays on 2.x because the binding declares `peerDependencies: msw ^2.10.2`. TypeScript stays on 5.9 because `typescript-eslint` supports `<6.1`.

## Folder structure

```
src/
  app/          query client, providers
  routes/       file-based routes (routeTree.gen.ts is generated and committed)
  contracts/    zod schemas + types shared by app and mocks
  shared/       api (Axios), realtime (socket), ui (shadcn), lib
  features/     one folder per domain (auth, catalog, cart, checkout, orders, profile, wallets, favorites, realtime)
  mocks/        MSW: handlers, socket server, db, fixtures, scenarios
  mocks/panel/  demo-only scenario panel (own React root)
e2e/            Playwright specs, fixtures, visual baselines (__screenshots__)
lighthouse/     audit config (lighthouse.config.mjs) and reports
scripts/        verify-socket-binding, verify-mocks, verify-realtime, lighthouse, fetch-figma-assets
```

## Theme

Tokens come from the Figma variables (dark-only Kurio theme) and live once in `src/index.css`. shadcn/ui semantic tokens (`--primary`, `--card`...) point at the Kurio tokens (`--kurio-*`).

Deviation from Figma: `--destructive` and `--success` are not in the file. They were chosen to keep at least 4.5:1 contrast on the ink background and on cards.

## Real-time transport

The app uses a real `socket.io-client`. MSW intercepts its WebSocket with `ws.link`, and `@mswjs/socket.io-binding` encodes and decodes the Socket.IO protocol. The mock server is `src/mocks/socket/socket-handler.ts`.

What the day-1 spike found, and how each point is handled:

| Finding | Effect if ignored | Handling |
| --- | --- | --- |
| The binding covers the WebSocket transport only. Socket.IO starts with HTTP long-polling by default. | Client never connects. | Client uses `transports: ['websocket']`. |
| MSW rewrites a client path of `/socket.io/` to `/` before matching, and ignores the query string. | `ws.link('…/socket.io/')` never matches. | The link is the bare origin (`ws://host/`); the client keeps the default path. |
| engine.io-client copies `globalThis.WebSocket` into a constant when its module first runs. | A static import runs before MSW patches WebSocket, so the socket silently bypasses the mocks. | `socket.io-client` is loaded with a dynamic import in `createSocket()`, after MSW starts. An ESLint rule blocks static imports in `src/`. |
| The binding fakes the handshake (`pingInterval` 25 s, `pingTimeout` 5 s) but never sends pings. | The client drops with `ping timeout` every ~30 s and reconnects. | The mock sends the Engine.IO ping packet (`"2"`) every 25 s per connection. |
| No rooms, namespaces (only `/`), broadcast or acknowledgements. | Private events cannot target a user. | The mock keeps a registry of connections; `session.auth` binds a connection to a user; `emitToUser` and `broadcast` loop over the registry. |
| The handshake `sid` is always `"test"`. | None for this app. | Documented only. |

`pnpm verify:socket` checks all of the above in Node with the same pieces, including a control connection without the heartbeat that must drop with `ping timeout`.

## Layers and data flow

```
UI (routes, features/*/components)
   │  hooks: useQuery / useMutation (TanStack Query), route loaders and guards (TanStack Router)
   ▼
features/*/api.ts ── getParsed / sendParsed ── shared/api/client.ts (the only Axios instance)
   │                     every answer is parsed with the zod contract (src/contracts)
   ▼
REST over HTTP ──► MSW service worker ──► src/mocks/handlers (+ mock DB in localStorage)
socket.io-client ◄─ WebSocket ◄─ MSW ws.link + @mswjs/socket.io-binding ◄─ src/mocks/realtime.ts
```

- **One contract, two sides.** `src/contracts/*.ts` holds zod schemas and their types. The app parses every response with them; the mocks build their responses with the same types. A shape change breaks the build on both sides.
- **No fake data outside `src/mocks`.** Components, hooks and the Axios client only know the HTTP contract. Mocks are switched on with `VITE_API_MOCKING=enabled` and are part of the demo build.
- **The page renders before the worker starts.** `src/main.tsx` renders at once; the first Axios request and the socket wait for `mocksReady` (`src/shared/api/mocks-ready.ts`), so nothing escapes the mocks while the page, skeletons and images paint. `<html data-mocks="ready">` marks the moment for tests.

## REST contracts

Base URL `VITE_API_URL` (`/api`). JSON everywhere. Authenticated calls send `Authorization: Bearer <token>`; every call sends `X-Cart-Token` (the guest cart). ETH values travel as **decimal strings** (`"1.19"`), never numbers; quantities are integers.

| Resource | Method and path | Notes |
| --- | --- | --- |
| Session | `POST /auth/register` | 201 `{ user, token, expiresAt }`; 409 `EMAIL_TAKEN` / `USERNAME_TAKEN` with field errors |
| | `POST /auth/login` | 401 `INVALID_CREDENTIALS` |
| | `GET /auth/session` | the current user; 401 `SESSION_EXPIRED` / `INVALID_SESSION` |
| | `POST /auth/logout` | ends the session on the server |
| NFTs | `GET /nfts?q&tab&category&chain&minPrice&maxPrice&sort&page&pageSize` | page of `NftSummary` + `total`, `totalPages`, `facets` (counts per category/chain, price range) |
| | `GET /nfts/:id` | `NftDetail` with editions (`available`, `maxPerOrder`, `price`) and `version`; 404 `NFT_NOT_FOUND` |
| Favorites | `GET /favorites`, `GET /favorites/items` | ids / cards of the user |
| | `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` | idempotent toggles |
| Cart | `GET /cart` | owner = signed-in user, else the guest token; has a `version` |
| | `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id` | 409 `AVAILABILITY_CONFLICT` above stock or `maxPerOrder` |
| | `PUT /cart/coupon`, `DELETE /cart/coupon` | 422 on `couponCode`: "Cupom inválido." / "Este cupom expirou." |
| | `POST /cart/merge` | after login: guest lines move into the user's cart, clamped to stock (`adjustments`) |
| Quote | `POST /quotes { cartVersion, network }` | lines, subtotal, discount, network fee, total, `expiresAt` (10 min). The quote is the reference for the order |
| Orders | `POST /orders` + header `Idempotency-Key` | see *Checkout and idempotency*; 409 `QUOTE_STALE`, `AVAILABILITY_CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `CART_EMPTY`; 404 `QUOTE_NOT_FOUND` |
| | `GET /orders?status=pending`, `GET /orders/:id` | the order with its frozen `receipt`; 403 for another user's order |
| Profile | `PATCH /me` + header `If-Match: <version>` | 409 `VERSION_CONFLICT` when the profile changed elsewhere |
| | `PUT /me/password`, `PUT /me/avatar`, `DELETE /me/avatar` | 422 with field errors (`Senha atual incorreta.`) |
| Wallets | `GET /wallets`, `POST /wallets`, `PUT /wallets/:id`, `POST /wallets/:id/primary`, `DELETE /wallets/:id` | primary + secondary (limit 2); 409 `WALLET_DUPLICATE`, `WALLET_LIMIT`; another user's wallet answers 404 |
| System | `GET /health` | |

**Errors** always have one shape: `{ error: { code, message, fields?, retryable } }` (`src/contracts/api-error.ts`). The client turns every failure (HTTP, timeout, no network) into an `ApiError` with `status`, `code` and `retryable`, so queries and forms handle one type. Covered statuses: 400, 401 (invalid/expired session), 403 (permission), 404, 409 (conflict/availability/version), 422 (validation, per field), 500/503 (transient, `retryable: true`), and the client-side `NETWORK_ERROR` / `TIMEOUT`.

## Real-time events

Socket.IO on the default namespace. After connecting, the client sends `session.auth` with its token; the server binds the connection to that user. `nft.updated` is broadcast; `order.updated` goes only to the owner's connections.

Every event has the same envelope (`src/contracts/realtime.ts`):

```ts
{ eventId: string, type: 'nft.updated' | 'order.updated', resource: { type, id }, version: number, occurredAt: string, data }
```

| Event | `data` | Client effect |
| --- | --- | --- |
| `nft.updated` | `price`, `previousPrice`, `soldOut`, `editions[{ editionId, price, available }]` | patches the NFT in every cached catalog page and the detail; invalidates the cart and its quotes when the NFT is in the cart; toast + inline note on the cart line |
| `order.updated` | `userId`, `status` (`pending` → `confirmed` / `rejected`), `txHash`, `rejectReason` | patches the order; confirmed: refetch the cart (bought quantities left it) and toast; rejected: toast, the cart keeps everything |

Rules (`src/features/realtime/apply-events.ts`):

1. **Duplicates:** the last 500 `eventId`s are remembered; a repeat is ignored, so effects (toasts, invalidations) never run twice.
2. **Old events:** an event whose `version` is not newer than the cached resource is ignored; nothing goes back to an older price or status.
3. **Terminal orders:** once `confirmed` or `rejected`, an order never changes again.
4. **Other users:** an `order.updated` whose `userId` is not the session user is dropped.
5. **Lifecycle:** one socket per session "epoch" (guest or one user). Login, logout and user switch close the socket with all its listeners and open a new one (`realtime-sync.tsx`).

## REST + Socket.IO reconciliation

- REST is the source of truth; events are patches with versions.
- **After a reconnect** (`io.on('reconnect')`) the client invalidates the active catalog, cart and order queries, so anything missed while offline is fetched again.
- **Order pages poll** every 4 s while the order is pending. The event usually settles it first; the poll is the safety net for an event lost while the socket was down or between reconnecting and re-authenticating.
- **Mock side:** every data change goes through the mock DB and publishes its event from there (`src/mocks/realtime.ts`), so REST answers and events always agree. A data reset drops every socket; clients reconnect and reconcile.
- **Price/stock change in checkout:** the cart quote is invalidated; the new total differs from the total the user accepted, so "Confirmar compra" is disabled and "Os valores mudaram" asks for an explicit accept. The server also refuses an order on a stale quote (`QUOTE_STALE`).

## Session policy

- Login returns a token (TTL 2 h). It is kept in `localStorage` (`kurio-session`), so a refresh keeps the user signed in. With a real API the token would be an httpOnly cookie; the mock keeps it readable to stay self-contained.
- Private routes (`/checkout`, `/profile*`, `/favorites`, `/orders/*`) use `requireAuth` in `beforeLoad`: the session is validated with `GET /auth/session` before the page renders.
- **Expiry** (any 401 `SESSION_EXPIRED`/`INVALID_SESSION` for the token in use): the store signs out with reason `expired`; the user goes to `/login?redirect=<page>&expired=true` with a notice and comes back to the same page after login. The checkout draft (sessionStorage) survives an expiry, so the checkout resumes.
- **Logout and user switch** remove every private query (`['me', …]`) and the session from the cache, rotate the guest cart token, clear the checkout draft (logout only) and replace the socket. A late answer for an old token never signs out a newer user (only the rejected token ends the session).
- Passwords: the mock stores salted SHA-256 hashes (Web Crypto), never plain text. Fictional accounts only.

## Cart state

- The cart lives on the (mock) server, owned by the signed-in user or by the guest token (`X-Cart-Token`, localStorage). It survives refresh in both cases.
- **Login merges** the guest cart into the user's (`POST /cart/merge`); quantities are clamped to stock and the user is told about each adjustment. Logout starts a new guest cart.
- **Totals come from the quote** (`POST /quotes`), not from the client: subtotal, coupon discount, network fee and total are rendered as the API returned them. Money math (when needed for display) uses `decimal.js` on strings.
- **Availability:** quantity steppers stop at `min(available, maxPerOrder)`; a line above stock after an event shows "Esta edição esgotou / Só restam N" with a fix button.
- **After a confirmed order** the server removes only the bought quantities; items added meanwhile stay. A failed or refused payment keeps everything.

## Cache, retry and synchronization policy

| Data | Query key | staleTime | Notes |
| --- | --- | --- | --- |
| Session | `['session', token]` | 5 min | keyed by token: a new login never reads the old entry |
| Catalog page | `['nfts', 'list', params]` | 30 s | `placeholderData: keepPreviousData` (dimmed refresh); AbortSignal cancels obsolete requests; key = all URL params |
| NFT detail | `['nfts', 'detail', id]` | 30 s | route loader `ensureQueryData` (direct access, 404) |
| Related / trending | `['nfts', …]` | 60 s | |
| Cart | `['me', userId, 'cart']` or `['cart', 'guest', token]` | 0 | always revalidated on mount |
| Quote | under the cart key | 60 s | refetched with `staleTime: 0` right before review |
| Favorites | `['me', userId, 'favorites', …]` | 5 min / 60 s | optimistic toggle (below) |
| Wallets | `['me', userId, 'wallets']` | 5 min | mutations answer with the full list → `setQueryData` |
| Orders | `['me', userId, 'orders', …]` | 10 s / 0 | polling every 4 s only while pending |

- **Retries:** queries retry at most 2 times, only when `retryable` (network, timeout, 5xx), with backoff 1 s → 2 s (max 4 s). 4xx never retries. Mutations never auto-retry; the order flow retries itself with the same idempotency key.
- **Invalidation:** each mutation updates or invalidates exactly what it changed (cart and its quotes, favorites, wallets, session user after a profile save). Events patch or invalidate as described above.
- **Isolation:** every private key starts with `['me', userId]`; logout and user switch remove `['me']` entirely.
- **Optimistic update with rollback (favorites):** the heart changes at once; on error only that NFT is put back (not a snapshot, so other hearts toggled meanwhile stay) and a toast explains it. Toggles of one NFT share a mutation scope, so the server receives them in click order. A click before the session or the list has loaded waits for them instead of guessing.

## Checkout and idempotency

1. "Confirmar compra" validates the form, then asks the simulated wallet to connect (approve / refuse; changing wallet, network or app disconnects).
2. A fresh quote is fetched. A total different from the one on screen stops the flow until the user accepts the new values.
3. The review dialog shows items, wallet, network and totals; nothing is sent before "Confirmar e pagar".
4. `POST /orders` carries `Idempotency-Key`, one key per quote, kept in sessionStorage with the request body while the outcome is unknown.
   - Same key + same body → the same order (the mock returns it, any status). Same key + other body → 409 `IDEMPOTENCY_KEY_REUSED`.
   - A lost answer (timeout, network, 5xx) is retried once with the same key. If the page is refreshed meanwhile, the checkout resends the stored request on load and opens the order it gets back. "Tentar de novo" does the same by hand. No path can create a second order.
   - Repeated clicks are blocked while the mutation runs; even if two requests left, the key makes them one order.
5. The order starts `pending`; the simulated chain settles it after 3 s (`order.updated`, or `GET /orders/:id`). Pending orders resume after a refresh (mock and page). The receipt is shown only for `confirmed`; `rejected` shows the refusal and keeps the cart.
6. **Receipt snapshot:** the order stores a frozen copy of the quote (`receipt`); later catalog changes never change it.

## Mocks (MSW)

- **Mock DB:** `src/mocks/db/store.ts`, one JSON state in `localStorage` (`kurio-mock-db`, schema version 4 with migrations). Fixtures: 60 NFTs (9 categories, 3 chains, 4 edition kinds, sold-out editions), 2 users, 3 wallets, coupons. `reset()` restores the exact seed.
- **Network layer:** `withNetwork(route, resolver, { failOn })` adds the scenario's latency and failures around each handler (`src/mocks/network.ts`). Business scenarios (expired session, sold out, payment result…) live in the handlers.
- **Scenarios:** listed in `README.md`; chosen by `?scenario=` / `?latency=`, the demo panel, or `/__mocks/config`; kept per tab in sessionStorage. Each new scenario restarts its counters, so it is reproducible.
- **Control routes** (mock only, used by Playwright and the panel): `GET /__mocks/state`, `POST /__mocks/config`, `POST /__mocks/reset`, `POST /__mocks/emit` (price, stock, replay of a recorded event for duplicates/old events, socket disconnect).
- **Transport limits:** see *Real-time transport* above (WebSocket only, no rooms or acks, fixed `sid`). The mock socket server lives in the page: each tab has its own mock "server", so two tabs do not see each other's events (they share the DB through localStorage and reconcile on refresh).
- **Bundle note:** `tough-cookie` is aliased to a stub (`src/mocks/lib/tough-cookie-stub.ts`). MSW uses it only for its mock cookie store and this API uses no cookies; the stub removes ~260 KB (tough-cookie + tldts) from the demo bundle.
- **Demo panel:** `src/mocks/panel/scenario-panel.tsx`, mounted in its own React root after the worker starts. Hidden when `navigator.webdriver` is true (Playwright, Lighthouse), so it never covers screenshots.

## Testing

- `pnpm verify:mocks` (102 checks) and `pnpm verify:realtime` (11) exercise the handlers and the event rules in Node.
- `pnpm test:e2e`: Playwright, Chromium, desktop 1440 and mobile 390 projects, against `pnpm build && pnpm preview`. Specs follow the brief §9 list (`e2e/01…12`), plus `visual.spec.ts` (home, detail, cart, checkout baselines in `e2e/__screenshots__`).
  - Isolation: a new browser context per test = empty storage = the seed; the scenario is written to the tab before the app loads.
  - REST goes through the MSW handlers; real-time tests emit through the mock Socket.IO server and are received by `socket.io-client`.
  - Time: latency 0 by default; `page.clock` moves the payment settlement and the scheduled price change; the visual spec fixes the date.
  - HTML report in `playwright-report/`, traces kept on failure.
- Baselines are rendered on Linux (fonts are self-hosted, but anti-aliasing differs per OS). Update them on Linux, e.g. in the Playwright Docker image (see README).

## Performance

Audit: `pnpm lighthouse` (config in `lighthouse/lighthouse.config.mjs`, reports and medians in `lighthouse/reports/`). Done on the production build with the default scenario, without any audit-only change.

What was done for it: shimmer skeletons with the content size (CLS 0), `width`/`height` and `srcset` (320/640/960 WebP) on every artwork, `fetchpriority="high"` + a `<link rel="preload">` for the home LCP image, route code splitting, preloading the two chunks Vite leaves behind dynamic imports (mock worker, home route), rendering before the worker starts, the `tough-cookie` stub, self-hosted variable font with `font-display: swap`, `robots.txt`.

**Below target: mobile Performance (home 65, detail 70; single runs 62–70).** Desktop is 97–98 on both pages; Accessibility, Best Practices and SEO are 100 on all four. On the mobile profile (simulated slow 4G, 150 ms RTT, 1.6 Mbps, 4× CPU) the causes are:

1. **The API runs in the browser.** No data exists until the MSW chunk (~55 KB gzip) has downloaded, the service worker has registered, and the first handler has answered. The mobile LCP element is the first catalog card image, which needs that data. With a real API this whole step disappears.
2. **Client-only rendering.** About 300 KB gzip of JavaScript (React DOM, Router, Query, zod, Axios, MSW) has to download and run on a 4×-slower CPU before the first paint. The real, unthrottled numbers on the same run are FCP ~0.4 s and LCP ~0.8 s; the simulation turns each request round trip into ~0.6 s.
3. **Main-thread cost** (TBT 280–450 ms, the noisiest metric between runs) comes from parsing that JavaScript and from starting the mock layer (fixtures, socket binding). The audit machine has 2 vCPUs; Lighthouse multiplies the observed CPU time by 4, so small timing differences move the score by a few points.

The next steps for a production build would be a real API (removes cause 1), server rendering or prerendering of the home shell (cause 2), and moving the auth forms and dialogs out of the first chunk.

## Figma deviations and UX decisions

- **Mobile frames that do not exist** (profile, wallets, order confirmation) follow the patterns of the mobile Pagamento/Início frames: back button + title, rounded cards, full-width gradient pill for the main action, no footer.
- **Behaviour the brief requires and the Figma does not draw:** wallet connection simulation (connect / refuse / disconnect), the review dialog before paying, "Os valores mudaram" notice, pending/refused order screens, empty and error states, skeletons. They reuse the file's tokens and components.
- **Mobile sort** lives in the filters sheet; the mobile frame has no sort control.
- **Carousel dots** keep the 12 px dot but have a 24 px hit area (WCAG 2.5.8), so the dots sit 24 px apart.
- **Share icons** use LinkedIn/X glyphs with an accessible name instead of text marks.
- **Colours:** `--destructive` and `--success` are not in the file; chosen for ≥ 4.5:1 contrast. Focus rings use the accent colour.
- **Out-of-scope actions** (editorial pages, activity, offers, downloads, newsletter, social sign-in, scan) open an explicit "fora do escopo" notice and never look successful.
- **Assets:** NFT artwork comes from the Figma file (`scripts/fetch-figma-assets.ts`), saved as WebP in three widths; Roboto Mono is self-hosted (`@fontsource-variable/roboto-mono`). Icons are lucide-react, close to the Figma set.
- **Accessibility additions:** skip link, visible focus everywhere, labelled icon buttons, errors tied to fields (`aria-describedby`, `aria-invalid`, focus on the first error), live regions for toasts and real-time changes, states shown with text/ARIA and not only colour (`aria-pressed`, check marks, "esgotada"), focus trapped in dialogs and sheets and returned to the opener, reduced motion respected.
