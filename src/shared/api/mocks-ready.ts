/**
 * The app renders at once; only the network waits. In mock mode the first
 * request (Axios) and the socket (socket.io-client) wait for the MSW worker,
 * so nothing escapes the mocks, while the page, its skeletons and images
 * paint in parallel with the worker start (better FCP/LCP).
 */
let resolve!: () => void
let reject!: (error: unknown) => void
export const mocksReady = new Promise<void>((res, rej) => {
  resolve = res
  reject = rej
})
// The startup error screen reports a failure; callers still see the rejection.
mocksReady.catch(() => undefined)

export const markMocksReady = () => resolve()
export const markMocksFailed = (error: unknown) => reject(error)
