# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Analytics:**
- Vercel Analytics - Usage tracking & site metrics
  - SDK/Client: @vercel/analytics 1.6.1 (`@vercel/analytics/next`)
  - Integration: Imported in `app/layout.tsx` as `<Analytics />` component
  - Auth: None required (automatic with Vercel deployment)

**Font Delivery:**
- Google Fonts API - Serving monospace fonts (Fira Code, IBM Plex Mono, JetBrains Mono, Source Code Pro)
  - Integration: CSS link loaded in `app/layout.tsx` (lines 29-34)
  - URL: `https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Source+Code+Pro:wght@400;500;600&display=swap`
  - Preconnection: DNS & resource hints configured for `https://fonts.googleapis.com` and `https://fonts.gstatic.com`

## Data Storage

**Databases:**
- None - This is a static site with no backend database

**Client-Side Persistence:**
- localStorage (Browser Web Storage API)
  - Theme preference: `terminal-theme` key
  - Font preference: `terminal-font` key
  - Virtual File System state: `vfs-state` key (JSON serialized)
  - Used in: `components/terminal.tsx` (localStorage.getItem/setItem)
  - Serialization: VFS implements `toJSON()` and `fromJSON()` with circular parent reference handling

**File Storage:**
- Local filesystem only (static data files)
  - `/data/books.json` - Book collection (140 KB)
  - `/data/vinyl.json` - Vinyl record collection (41 KB)
  - `/data/hardware.json` - Hardware specifications (2.3 KB)
  - Loaded at build-time and embedded in component: `components/terminal.tsx` (imports as JSON)

**Caching:**
- Browser caching (default Next.js behavior)
- No explicit cache headers or CDN configuration detected
- Image optimization disabled in next.config.mjs

## Authentication & Identity

**Auth Provider:**
- None - Static portfolio site, no user authentication
- No login/registration system
- GitHub link: Hardcoded URL `https://github.com/zacblev1` in terminal output

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, LogRocket, or similar error tracking
- Native browser error handling only

**Logs:**
- Console logging only
  - VFS restoration logs errors to console: `console.error("Failed to load VFS from JSON", e)` in `lib/vfs.ts` (line 269)
  - No structured logging framework

**Analytics:**
- Vercel Analytics (as noted above) - Automatic page view & performance tracking

## CI/CD & Deployment

**Hosting:**
- Vercel (implied by @vercel/analytics integration and Next.js 15 App Router usage)
- Can run on any Node.js-compatible platform (Docker, traditional servers)

**CI Pipeline:**
- Not detected - No GitHub Actions, CircleCI, or other CI config found
- build script: `next build`
- start script: `next start`
- dev script: `next dev`
- lint script: `eslint .` (linting only, not blocking builds per next.config.mjs)

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables
- No .env files present
- No secrets management needed
- All configuration is hardcoded or stored in localStorage

**Secrets location:**
- Not applicable - No secrets or API keys in use

**Public vs. Private Keys:**
- All external resources (Google Fonts, Vercel) are public APIs requiring no keys

## Webhooks & Callbacks

**Incoming:**
- None - Static portfolio, no webhook endpoints

**Outgoing:**
- None - No external API calls from the application
- Analytics sent automatically by @vercel/analytics (transparent to application)
- No custom API calls detected in code

## Browser APIs Used

**Web Storage:**
- localStorage - Full read/write for persistence (theme, font, VFS state)

**Canvas API:**
- Used in Tron game (`components/games/tron-game.tsx`)
- requestAnimationFrame for game loop rendering

**DOM APIs:**
- Standard React DOM API usage only
- No WebSockets, Service Workers, or other advanced browser APIs

## CDN & Asset Delivery

**Font CDN:**
- Google Fonts CDN (googleapis.com, gstatic.com)
- Preconnect configured in HTML head for performance

**Image Handling:**
- Image optimization disabled (`images.unoptimized: true` in next.config.mjs)
- Placeholder images used: `https://placehold.co/400x600?text=...` for book covers (in data)

## Third-Party Scripts & Services

**Vercel Integration:**
- @vercel/analytics script injection (automatic when deployed on Vercel)
- No other third-party scripts detected

**No integrations for:**
- Email/newsletter services (no Mailchimp, Brevo, etc.)
- CMS or headless CMS (Contentful, Sanity, etc.)
- Search services (Algolia, Meilisearch)
- Chat/support (Intercom, Drift, etc.)
- Payment processing (Stripe, PayPal)
- Authentication services (Auth0, Clerk, etc.)
- Real-time data (Firebase, Supabase)
- Image optimization (Cloudinary, Imgix)

---

*Integration audit: 2026-01-22*
