import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSound } from '@/lib/hooks/useSound'

// Mock Audio
class MockAudio {
  src = ''
  volume = 1
  play = vi.fn().mockResolvedValue(undefined)
  cloneNode = vi.fn().mockReturnThis()
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: () => { store = {} },
  }
})()

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
})

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio)
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('useSound', () => {
  it('defaults to disabled', () => {
    const { result } = renderHook(() => useSound())
    expect(result.current.enabled).toBe(false)
  })

  it('toggles sound on/off', () => {
    const { result } = renderHook(() => useSound())
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(false)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSound())
    act(() => result.current.toggle())
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sound-enabled', 'true')
  })

  it('play does nothing when disabled', () => {
    const { result } = renderHook(() => useSound())
    result.current.play('keyclick')
    // No error thrown
  })
})
