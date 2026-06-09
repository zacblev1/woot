/**
 * Canonical site URL resolution.
 * Set NEXT_PUBLIC_SITE_URL in production for a stable canonical domain;
 * otherwise fall back to the Vercel production URL, then localhost for dev.
 */
export function getSiteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL)
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  }
  return new URL('http://localhost:3000')
}
