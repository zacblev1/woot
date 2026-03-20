// components/terminal-chrome.tsx
"use client"

import type { ReactNode } from 'react'
import { useTerminalContext } from '@/lib/terminal-context'
import { themes } from '@/lib/terminal-config'
import { VALID_COMMANDS } from '@/components/terminal/types'

export function TerminalChrome({ children }: { children: ReactNode }) {
  const { currentDirectory, currentTheme, soundEnabled } = useTerminalContext()

  return (
    <div className="w-full max-w-4xl h-full md:h-[80vh] bg-card border border-border shadow-2xl flex flex-col relative">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div data-dot="close" className="w-2.5 h-2.5 rounded-full" style={{ background: '#f56565' }} />
            <div data-dot="minimize" className="w-2.5 h-2.5 rounded-full" style={{ background: '#ecc94b' }} />
            <div data-dot="maximize" className="w-2.5 h-2.5 rounded-full" style={{ background: '#48bb78' }} />
          </div>
          <span className="text-muted-foreground text-xs ml-2 font-mono">
            zachary@home: {currentDirectory}
          </span>
        </div>
        <span className="text-muted-foreground text-[10px] font-mono">
          {themes[currentTheme].name}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {children}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-card border-t border-border text-[10px] font-mono text-muted-foreground shrink-0">
        <div className="flex gap-4">
          <span><span className="text-primary">▸</span> {currentDirectory}</span>
          <span>{VALID_COMMANDS.length} commands</span>
        </div>
        <div className="flex gap-4">
          <span>{soundEnabled ? '🔊 sound on' : '🔇 sound off'}</span>
          <span>Ctrl+K search</span>
        </div>
      </div>
    </div>
  )
}
