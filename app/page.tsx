"use client"

import { Terminal } from "@/components/terminal"

export default function Home() {
  return (
    <div className="h-full w-screen flex items-center justify-center bg-background p-2 md:p-8">
      <div className="w-full max-w-4xl h-full md:h-[80vh] bg-card border border-border shadow-2xl">
        <Terminal />
      </div>
    </div>
  )
}
