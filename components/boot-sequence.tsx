"use client"

import { useState, useEffect, useCallback, useSyncExternalStore, type ReactNode } from 'react'

interface BootSequenceProps {
  children: ReactNode
}

// sessionStorage/matchMedia never notify; the snapshot only changes via dismiss(),
// which re-renders through setState instead.
const emptySubscribe = () => () => {}

function bootAlreadySeen(): boolean {
  return (
    !!sessionStorage.getItem('boot-v2-complete') ||
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export function BootSequence({ children }: BootSequenceProps) {
  // Server snapshot says "seen" so the overlay never renders during SSR;
  // the client snapshot takes over after hydration.
  const alreadySeen = useSyncExternalStore(emptySubscribe, bootAlreadySeen, () => true)
  const [dismissed, setDismissed] = useState(false)
  const showOverlay = !alreadySeen && !dismissed

  const dismiss = useCallback(() => {
    setDismissed(true)
    sessionStorage.setItem('boot-v2-complete', 'true')
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {children}
      {showOverlay && <BootOverlay onDismiss={dismiss} />}
    </div>
  )
}

function BootOverlay({ onDismiss }: { onDismiss: () => void }) {
  // Dismiss on any keypress, or automatically when the reveal animation ends
  useEffect(() => {
    const handleKey = () => onDismiss()
    window.addEventListener('keydown', handleKey)
    const timer = setTimeout(onDismiss, 3000)
    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
    }
  }, [onDismiss])

  return (
    <div
      data-boot-overlay
      className="absolute inset-0 z-50 bg-background"
      onClick={onDismiss}
      style={{
        animation: 'glitch-reveal 3s ease-out forwards',
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center font-mono text-primary text-lg"
        style={{
          animation: 'color-separation 0.3s infinite',
        }}
      >
        <span className="opacity-30">INITIALIZING...</span>
      </div>
    </div>
  )
}
