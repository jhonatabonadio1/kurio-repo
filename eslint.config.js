import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'public/mockServiceWorker.js',
      'src/routeTree.gen.ts',
      'playwright-report',
      'test-results',
      'lighthouse/reports',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Route files export `Route`; shadcn files export variants.
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright fixtures call `use()`, which is not the React hook.
    files: ['e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    // engine.io-client captures globalThis.WebSocket at import time, so a static
    // import would run before MSW patches it. Load it only via createSocket().
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/mocks/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: ['socket.io-client', 'engine.io-client'].map((name) => ({
            name,
            allowTypeImports: true,
            message: 'Use createSocket() from @/shared/realtime/socket (dynamic import, after MSW starts).',
          })),
          // The app never imports mock data; only main.tsx loads the worker dynamically.
          patterns: [
            {
              group: ['@/mocks', '@/mocks/*', '**/mocks/*'],
              message: 'App code must not depend on mocks. Talk to the API through Axios.',
            },
          ],
        },
      ],
    },
  },
)
