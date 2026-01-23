import { renderHook, act } from '@testing-library/react'
import { TerminalProvider, useTerminal, useTerminalOptional } from '../TerminalContext'
import type { ReactNode } from 'react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: () => { store = {} },
  }
})()

const setPropertyMock = vi.fn()

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  Object.defineProperty(document.documentElement, 'style', {
    value: { setProperty: setPropertyMock },
    writable: true,
  })
})

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

// Wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <TerminalProvider>{children}</TerminalProvider>
)

describe('TerminalContext', () => {
  describe('TerminalProvider', () => {
    it('provides all four hook returns', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      expect(result.current.history).toBeDefined()
      expect(result.current.game).toBeDefined()
      expect(result.current.theme).toBeDefined()
      expect(result.current.font).toBeDefined()
    })

    it('provides history methods', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      expect(result.current.history.history).toEqual([])
      expect(result.current.history.historyIndex).toBe(-1)
      expect(typeof result.current.history.add).toBe('function')
      expect(typeof result.current.history.clear).toBe('function')
      expect(typeof result.current.history.navigateUp).toBe('function')
      expect(typeof result.current.history.navigateDown).toBe('function')
      expect(typeof result.current.history.resetNavigation).toBe('function')
    })

    it('provides game methods', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      expect(result.current.game.gameState).toBeDefined()
      expect(result.current.game.isPlaying).toBe(false)
      expect(result.current.game.currentGame).toBeNull()
      expect(typeof result.current.game.startGame).toBe('function')
      expect(typeof result.current.game.endGame).toBe('function')
      expect(typeof result.current.game.updateData).toBe('function')
    })

    it('provides theme methods', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      expect(result.current.theme.theme).toBeDefined()
      expect(result.current.theme.themeConfig).toBeDefined()
      expect(typeof result.current.theme.setTheme).toBe('function')
      expect(Array.isArray(result.current.theme.availableThemes)).toBe(true)
    })

    it('provides font methods', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      expect(result.current.font.font).toBeDefined()
      expect(result.current.font.fontConfig).toBeDefined()
      expect(typeof result.current.font.setFont).toBe('function')
      expect(Array.isArray(result.current.font.availableFonts)).toBe(true)
    })
  })

  describe('useTerminal', () => {
    it('throws helpful error outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return useTerminal()
        } catch (e) {
          return e
        }
      })

      expect(result.current).toBeInstanceOf(Error)
      expect((result.current as Error).message).toContain('TerminalProvider')
    })

    it('history operations work through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.history.add('ls')
        result.current.history.add('pwd')
      })

      expect(result.current.history.history).toEqual(['ls', 'pwd'])
    })

    it('history navigation works through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.history.add('first')
        result.current.history.add('second')
      })

      let command: string | null = null
      act(() => {
        command = result.current.history.navigateUp()
      })

      expect(command).toBe('second')
      expect(result.current.history.historyIndex).toBe(1)
    })

    it('game operations work through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.game.startGame('number', {
          target: 42,
          attempts: 0,
          maxAttempts: 10,
          guesses: [],
        })
      })

      expect(result.current.game.isPlaying).toBe(true)
      expect(result.current.game.currentGame).toBe('number')
    })

    it('game endGame works through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.game.startGame('number', {
          target: 42,
          attempts: 0,
          maxAttempts: 10,
          guesses: [],
        })
      })

      expect(result.current.game.isPlaying).toBe(true)

      act(() => {
        result.current.game.endGame()
      })

      expect(result.current.game.isPlaying).toBe(false)
      expect(result.current.game.currentGame).toBeNull()
    })

    it('theme operations work through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.theme.setTheme('dracula')
      })

      expect(result.current.theme.theme).toBe('dracula')
    })

    it('font operations work through context', () => {
      const { result } = renderHook(() => useTerminal(), { wrapper })

      act(() => {
        result.current.font.setFont('fira')
      })

      expect(result.current.font.font).toBe('fira')
    })
  })

  describe('useTerminalOptional', () => {
    it('returns null outside provider', () => {
      const { result } = renderHook(() => useTerminalOptional())
      expect(result.current).toBeNull()
    })

    it('returns context inside provider', () => {
      const { result } = renderHook(() => useTerminalOptional(), { wrapper })
      expect(result.current).not.toBeNull()
      expect(result.current?.history).toBeDefined()
    })

    it('provides full context value inside provider', () => {
      const { result } = renderHook(() => useTerminalOptional(), { wrapper })

      expect(result.current?.history).toBeDefined()
      expect(result.current?.game).toBeDefined()
      expect(result.current?.theme).toBeDefined()
      expect(result.current?.font).toBeDefined()
    })
  })

  describe('context value memoization', () => {
    it('maintains stable hook references', () => {
      const { result, rerender } = renderHook(() => useTerminal(), { wrapper })

      const firstHistory = result.current.history
      const firstGame = result.current.game
      const firstTheme = result.current.theme
      const firstFont = result.current.font

      // Trigger a rerender
      rerender()

      // Hook objects should be same references (due to useMemo/useCallback)
      expect(result.current.history.add).toBe(firstHistory.add)
      expect(result.current.game.startGame).toBe(firstGame.startGame)
      expect(result.current.theme.setTheme).toBe(firstTheme.setTheme)
      expect(result.current.font.setFont).toBe(firstFont.setFont)
    })
  })
})
