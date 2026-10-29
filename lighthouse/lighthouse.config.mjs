/**
 * Lighthouse audit setup (brief §10). Versioned with the code; used by
 * scripts/lighthouse.mjs. Change pages or runs here, not in the script.
 */
export default {
  /** Production build served by `pnpm preview` with the default mock scenario. */
  baseUrl: process.env.LH_BASE_URL ?? 'http://localhost:4173',
  pages: [
    { id: 'home', path: '/' },
    { id: 'detail', path: '/nfts/emerald-ape-042' },
  ],
  /** Lighthouse defaults: mobile = Moto G Power, slow 4G, 4× CPU; desktop = the desktop preset. */
  profiles: ['mobile', 'desktop'],
  runs: 3,
  categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
  outDir: 'lighthouse/reports',
}
