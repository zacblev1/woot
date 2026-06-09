import type React from "react"
import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Fira_Code, Source_Code_Pro, IBM_Plex_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { getSiteUrl } from "@/lib/site"
import "./globals.css"

// Self-hosted via next/font; the terminal `font` command switches between
// these families through the CSS variables defined here.
//
// adjustFontFallback MUST stay false: the default injects a size-adjusted
// Arial fallback, and any glyph missing from the latin subset (the banner's
// box-drawing characters: █ ╔ ═ ║) would render proportionally and wreck
// ASCII art alignment. The explicit fallback keeps everything monospace.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
})
const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
})
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-code-pro",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
})

const fontVariables = `${jetbrainsMono.variable} ${firaCode.variable} ${sourceCodePro.variable} ${ibmPlexMono.variable}`

const SITE_NAME = "Zachary Blevins — Terminal Portfolio"
const SITE_DESCRIPTION =
  "An interactive retro-terminal portfolio: browse books, vinyl, and hardware collections, play arcade games, and explore via a real command line."

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: "%s | Zachary Blevins",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    url: "/",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: "/icon.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`h-full ${fontVariables}`}>
      <body className="font-sans antialiased h-full">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
