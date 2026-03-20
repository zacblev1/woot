"use client"

import { Terminal } from "@/components/terminal"
import { TerminalChrome } from "@/components/terminal-chrome"
import { CRTEffects } from "@/components/crt-effects"
import { TerminalContextProvider } from "@/lib/terminal-context"
import { BootSequence } from "@/components/boot-sequence"

export default function Home() {
  return (
    <div className="h-full w-screen flex items-center justify-center bg-background p-2 md:p-8">
      <TerminalContextProvider>
        <BootSequence>
          <TerminalChrome>
            <Terminal />
            <CRTEffects />
          </TerminalChrome>
        </BootSequence>
      </TerminalContextProvider>
    </div>
  )
}
