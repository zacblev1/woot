import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { getSiteUrl } from "@/lib/site"
import "./globals.css"

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
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Source+Code+Pro:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans antialiased h-full ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
