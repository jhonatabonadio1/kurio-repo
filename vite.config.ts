import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Two chunks are loaded by dynamic import, so Vite does not preload them:
 * the MSW worker setup (src/mocks/browser.ts, needed before any data) and the
 * home route component (TanStack autoCodeSplitting). Fetching them from the
 * HTML, in parallel with the entry, removes two round trips from the critical
 * chain on slow networks. Nothing changes in what the page loads or runs.
 */
function preloadCriticalChunks(mocking: boolean): Plugin {
  const wanted = [/src\/routes\/index\.tsx\?tsr-split=component$/, ...(mocking ? [/src\/mocks\/browser\.ts$/] : [])]
  return {
    name: 'kurio:preload-critical-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk')
        const byName = new Map(chunks.map((c) => [c.fileName, c]))
        const files = new Set<string>()
        const add = (fileName: string) => {
          if (files.has(fileName) || html.includes(fileName)) return
          files.add(fileName)
          for (const dep of byName.get(fileName)?.imports ?? []) add(dep)
        }
        for (const chunk of chunks) if (chunk.facadeModuleId && wanted.some((re) => re.test(chunk.facadeModuleId!))) add(chunk.fileName)
        return {
          html,
          tags: [...files].map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
            injectTo: 'head' as const,
          })),
        }
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const mocking = (env.VITE_API_MOCKING ?? process.env.VITE_API_MOCKING ?? 'enabled') !== 'disabled'
  return {
    plugins: [
      // Must come before the React plugin.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      preloadCriticalChunks(mocking),
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
        // MSW's mock cookie store is unused here (no cookies in this API); the stub
        // drops tough-cookie + tldts (~260 KB) from the demo bundle.
        { find: /^tough-cookie$/, replacement: path.resolve(import.meta.dirname, './src/mocks/lib/tough-cookie-stub.ts') },
      ],
    },
  }
})
