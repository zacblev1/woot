"use client"

import { useState, useEffect, useCallback, type ReactNode } from 'react'

interface BootSequenceProps {
  children: ReactNode
}

export function BootSequence({ children }: BootSequenceProps) {
  const [showOverlay, setShowOverlay] = useState(false)

  const dismiss = useCallback(() => {
    setShowOverlay(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('boot-v2-complete', 'true')
    }
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setShowOverlay(!sessionStorage.getItem('boot-v2-complete') && !reducedMotion)
  }, [])

  useEffect(() => {
    if (!showOverlay) return

    const handleKey = () => dismiss()
    window.addEventListener('keydown', handleKey)

    const timer = setTimeout(dismiss, 3000)

    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
    }
  }, [showOverlay, dismiss])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {children}
      {showOverlay && (
        <div
          data-boot-overlay
          className="absolute inset-0 z-50 bg-background"
          onClick={dismiss}
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
      )}
    </div>
  )
}
