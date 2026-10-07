import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    // tools/ holds offline build scripts (e.g. the Debian VM image), not app
    // code; public/vm/ is that image's build output (vendored v86 bundle).
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts', 'tools/**', 'public/vm/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Most hits are the standard "sync client-only state (localStorage/sessionStorage)
      // after mount" pattern, which Next.js needs to avoid hydration mismatches.
      // Keep visible as a warning; revisit with useSyncExternalStore in the
      // terminal refactor.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]

export default eslintConfig
