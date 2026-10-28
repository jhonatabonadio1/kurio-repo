# Architecture

Work in progress. Sections are filled in as each part lands.

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
  features/     one folder per domain (from day 1 afternoon)
  mocks/        MSW: handlers, socket server, db, fixtures, scenarios
scripts/        verify-socket-binding.ts
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

## Still to write

Contracts, session policy, cart state and guest merge, cache and retry policy, REST + socket reconciliation, idempotency, UX decisions, other Figma deviations, accessibility changes.
