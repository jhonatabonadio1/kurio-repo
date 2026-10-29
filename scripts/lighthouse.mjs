/**
 * Runs the Lighthouse audits from lighthouse/lighthouse.config.mjs:
 * every page × profile, N runs each, a fresh Chrome profile per run (first
 * visit: the MSW worker registers every time, like for a new user).
 *
 * Output (lighthouse/reports):
 * - <page>-<profile>-run<N>.report.{html,json} for every run;
 * - summary.json and summary.md: median of each category and of LCP/CLS/TBT,
 *   tool versions, environment and conditions.
 *
 * Usage: pnpm build && pnpm preview   (in another terminal)
 *        pnpm lighthouse
 * CHROME_PATH picks the Chrome binary (chrome-launcher default otherwise).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

import config from '../lighthouse/lighthouse.config.mjs'

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function ensureServer(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (error) {
    console.error(`Cannot reach ${url} (${error.message}). Run "pnpm build && pnpm preview" first.`)
    process.exit(1)
  }
}

async function audit(url, profile) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
  try {
    const flags = { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: config.categories }
    const result = await lighthouse(url, flags, profile === 'desktop' ? desktopConfig : undefined)
    return { lhr: result.lhr, report: result.report, chromeVersion: await chromeVersion(chrome.port) }
  } finally {
    await chrome.kill()
  }
}

async function chromeVersion(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`)
    return (await res.json()).Browser
  } catch {
    return 'unknown'
  }
}

await ensureServer(config.baseUrl)
const outDir = path.resolve(config.outDir)
await mkdir(outDir, { recursive: true })

const results = []
let chrome = 'unknown'
let lighthouseVersion = 'unknown'
for (const page of config.pages) {
  for (const profile of config.profiles) {
    const runs = []
    for (let run = 1; run <= config.runs; run++) {
      const url = new URL(page.path, config.baseUrl).href
      process.stdout.write(`${page.id} · ${profile} · run ${run}/${config.runs}… `)
      const { lhr, report, chromeVersion: version } = await audit(url, profile)
      chrome = version
      lighthouseVersion = lhr.lighthouseVersion
      const base = path.join(outDir, `${page.id}-${profile}-run${run}.report`)
      await writeFile(`${base}.html`, report[0])
      await writeFile(`${base}.json`, report[1])
      const scores = Object.fromEntries(config.categories.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]))
      const metrics = {
        lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
        cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
        tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
        fcpMs: Math.round(lhr.audits['first-contentful-paint'].numericValue),
      }
      runs.push({ run, scores, metrics, warnings: lhr.runWarnings })
      console.log(JSON.stringify(scores), `LCP ${metrics.lcpMs} ms · CLS ${metrics.cls} · TBT ${metrics.tbtMs} ms`)
    }
    const pick = (fn) => median(runs.map(fn))
    results.push({
      page: page.id,
      path: page.path,
      profile,
      median: {
        scores: Object.fromEntries(config.categories.map((c) => [c, pick((r) => r.scores[c])])),
        lcpMs: pick((r) => r.metrics.lcpMs),
        cls: pick((r) => r.metrics.cls),
        tbtMs: pick((r) => r.metrics.tbtMs),
        fcpMs: pick((r) => r.metrics.fcpMs),
      },
      runs,
    })
  }
}

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const environment = {
  date: new Date().toISOString(),
  lighthouse: lighthouseVersion,
  chrome,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: `${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length}`,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  app: `${pkg.name}@${pkg.version}`,
  baseUrl: config.baseUrl,
  conditions:
    'Production build (vite build) served by vite preview, VITE_API_MOCKING=enabled, default mock scenario. ' +
    'Headless Chrome, fresh profile per run (first visit). Lighthouse simulated throttling: ' +
    'mobile = default (Moto G Power, slow 4G 150 ms RTT / 1.6 Mbps, 4× CPU); desktop = desktop preset.',
}
await writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify({ environment, targets: config.targets, results }, null, 2)}\n`)

const mark = (category, value) => (value >= config.targets[category] ? `${value}` : `**${value}** ⚠`)
const lines = [
  '# Lighthouse — median of 3 runs',
  '',
  '| Page | Profile | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results.map(({ page, profile, median: m }) =>
    `| ${page} | ${profile} | ${config.categories.map((c) => mark(c, m.scores[c])).join(' | ')} | ${(m.lcpMs / 1000).toFixed(1)} s | ${m.cls} | ${m.tbtMs} ms |`,
  ),
  '',
  `Targets: ${Object.entries(config.targets).map(([c, v]) => `${c} ≥ ${v}`).join(', ')}. ⚠ = below target (see ARCHITECTURE.md › Performance).`,
  '',
  '## Environment',
  '',
  ...Object.entries(environment).map(([k, v]) => `- **${k}**: ${v}`),
  '',
]
await writeFile(path.join(outDir, 'summary.md'), lines.join('\n'))
console.log(`\n${lines.slice(0, results.length + 4).join('\n')}`)
