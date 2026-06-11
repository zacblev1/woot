import { useRef } from 'react'
import type React from 'react'

export type SwipeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

/** Dominant-axis direction of a drag, or null for movements under minDistance px. */
export function swipeDirection(dx: number, dy: number, minDistance = 24): SwipeDirection | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT'
  return dy > 0 ? 'DOWN' : 'UP'
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

/**
 * Swipe detection for touch (and mouse-drag) steering in the canvas games.
 * Spread the returned handlers onto a container — pair with the `touch-none`
 * class so the browser doesn't claim the gesture for scrolling.
 */
export function useSwipe(onSwipe: (dir: SwipeDirection) => void, minDistance = 24): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e) => {
      if (!start.current) return
      const dir = swipeDirection(e.clientX - start.current.x, e.clientY - start.current.y, minDistance)
      start.current = null
      if (dir) onSwipe(dir)
    },
  }
}
