"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

export function useIdleTimer(timeoutMs: number, enabled: boolean = true): boolean {
  const [idle, setIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset idleness when the timer is toggled (state adjustment during render)
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    setIdle(false)
  }

  const resetTimer = useCallback(() => {
    if (!enabled) return
    setIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs)
  }, [timeoutMs, enabled])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    // Arm the timeout without touching state: idleness was already reset when
    // `enabled` changed, and event listeners reset it from user input.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs)

    const events = ['keydown', 'mousedown', 'mousemove', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer, enabled, timeoutMs])

  return enabled ? idle : false
}
