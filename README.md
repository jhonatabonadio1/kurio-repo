# Kurio — NFT Marketplace

Frontend challenge: React + TypeScript, TanStack Router/Query, Axios, Socket.IO, Tailwind + shadcn/ui, MSW, Playwright and Lighthouse. All APIs and real-time events are simulated with MSW.

> Status: day 1 scaffold. The home page is a temporary **stack check** that proves REST (Axios → MSW) and real time (socket.io-client → MSW) work in the browser.

## Setup

Requires Node ≥ 20.19 and pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm dev            # http://localhost:5173
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_MOCKING` | `enabled` | Starts MSW (REST + Socket.IO). Keep it on in dev, demo build and tests. |
| `VITE_API_URL` | `/api` | Base URL for Axios. |
| `VITE_SOCKET_URL` | page origin | Socket.IO origin. |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with mocks |
| `pnpm build` | Type check + production build (mocks included when enabled) |
| `pnpm preview` | Serves the build on port 4173 |
| `pnpm typecheck` | `tsc` without emitting |
| `pnpm lint` | ESLint |
| `pnpm verify:socket` | Node check of the mock Socket.IO stack (~35 s, see below) |
| `pnpm test:e2e` | Playwright (specs land on day 3) |

## Real-time check

`pnpm verify:socket` connects a real `socket.io-client` to the MSW mock and checks: handshake, an event both ways, per-user routing, broadcast, rejected tokens, and that the connection survives the 30 s Engine.IO ping timeout. See `ARCHITECTURE.md › Real-time transport` for why each check exists.

## Deploy

Vercel, Vite preset. Set `VITE_API_MOCKING=enabled` in the project. `vercel.json` rewrites every route to `index.html`, so direct links and refresh work.
