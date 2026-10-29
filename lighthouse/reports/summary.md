# Lighthouse — median of 3 runs

| Page | Profile | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | mobile | **65** ⚠ | 100 | 100 | 100 | 4.6 s | 0 | 374 ms |
| home | desktop | 97 | 100 | 100 | 100 | 1.0 s | 0 | 0 ms |
| detail | mobile | **70** ⚠ | 100 | 100 | 100 | 4.4 s | 0 | 276 ms |
| detail | desktop | 98 | 100 | 100 | 100 | 0.9 s | 0 | 19 ms |

Targets: performance ≥ 90, accessibility ≥ 95, best-practices ≥ 95, seo ≥ 90. ⚠ = below target (see ARCHITECTURE.md › Performance).

## Environment

- **date**: 2026-10-29T23:31:59.370Z
- **lighthouse**: 12.8.2
- **chrome**: Chrome/153.0.8010.12
- **node**: v22.23.4
- **os**: Linux 6.18.44-fc-v185 (x64)
- **cpu**: Intel(R) Xeon(R) Processor @ 2.10GHz × 2
- **memoryGb**: 8
- **app**: kurio-nft-marketplace@0.1.0
- **baseUrl**: http://localhost:4173
- **conditions**: Production build (vite build) served by vite preview, VITE_API_MOCKING=enabled, default mock scenario. Headless Chrome, fresh profile per run (first visit). Lighthouse simulated throttling: mobile = default (Moto G Power, slow 4G 150 ms RTT / 1.6 Mbps, 4× CPU); desktop = desktop preset.
