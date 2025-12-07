"use client"

import { Terminal } from "@/components/terminal"

export default function Home() {
  return (
    <div className="min-h-screen min-h-[100dvh] w-screen flex items-center justify-center bg-background p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-4xl h-[calc(100vh-1rem)] h-[calc(100dvh-1rem)] sm:h-[calc(100vh-2rem)] sm:h-[calc(100dvh-2rem)] md:h-[80vh] bg-card border border-border shadow-2xl">
        <Terminal />
      </div>
    </div>
  )
}
