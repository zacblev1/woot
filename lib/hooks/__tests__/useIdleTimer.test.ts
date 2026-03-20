import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIdleTimer } from '@/lib/hooks/useIdleTimer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useIdleTimer', () => {
  it('is not idle initially', () => {
    const { result } = renderHook(() => useIdleTimer(5000))
    expect(result.current).toBe(false)
  })

  it('becomes idle after timeout', () => {
    const { result } = renderHook(() => useIdleTimer(5000))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current).toBe(true)
  })

  it('does not become idle when disabled', () => {
    const { result } = renderHook(() => useIdleTimer(5000, false))
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current).toBe(false)
  })
})
