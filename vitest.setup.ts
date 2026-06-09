import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Tests must never hit the network. Default fetch stub mirrors the scores API's
// empty-database response; individual tests can override with their own mocks.
vi.stubGlobal(
  'fetch',
  vi.fn(
    async () =>
      new Response(JSON.stringify({ scores: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )
)
