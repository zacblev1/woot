"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

export function useIdleTimer(timeoutMs: number, enabled: boolean = true): boolean {
  const [idle, setIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (!enabled) return
    setIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs)
  }, [timeoutMs, enabled])

  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    resetTimer()

    const events = ['keydown', 'mousedown', 'mousemove', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer, enabled])

  return idle
}
