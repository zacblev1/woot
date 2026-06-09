import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
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
