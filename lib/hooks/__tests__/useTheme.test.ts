import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'
import { DEFAULT_THEME, THEMES } from '@/lib/data/themes'
import type { ThemeName } from '@/lib/types/terminal'

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

// Mock document.documentElement.style.setProperty
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

describe('useTheme', () => {
  describe('initial state', () => {
    it('returns default theme initially', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(DEFAULT_THEME)
    })

    it('returns correct themeConfig for default theme', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.themeConfig).toEqual(THEMES[DEFAULT_THEME])
    })

    it('returns all available themes', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.availableThemes).toEqual(Object.keys(THEMES))
      expect(result.current.availableThemes).toContain('lumon')
      expect(result.current.availableThemes).toContain('dracula')
    })

    it('applies default theme CSS on mount', () => {
      renderHook(() => useTheme())

      expect(setPropertyMock).toHaveBeenCalledWith('--background', THEMES[DEFAULT_THEME].background)
      expect(setPropertyMock).toHaveBeenCalledWith('--foreground', THEMES[DEFAULT_THEME].foreground)
    })
  })

  describe('setTheme', () => {
    it('updates theme state', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dracula')
      })

      expect(result.current.theme).toBe('dracula')
    })

    it('updates themeConfig when theme changes', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('nord')
      })

      expect(result.current.themeConfig).toEqual(THEMES['nord'])
    })

    it('persists theme to localStorage', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('monokai')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('terminal-theme', 'monokai')
    })

    it('applies CSS variables when theme changes', () => {
      const { result } = renderHook(() => useTheme())

      vi.clearAllMocks()

      act(() => {
        result.current.setTheme('gruvbox')
      })

      expect(setPropertyMock).toHaveBeenCalledWith('--background', THEMES['gruvbox'].background)
      expect(setPropertyMock).toHaveBeenCalledWith('--primary', THEMES['gruvbox'].primary)
      expect(setPropertyMock).toHaveBeenCalledWith('--accent', THEMES['gruvbox'].accent)
    })

    it('ignores invalid theme name', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        // @ts-expect-error - testing invalid input
        result.current.setTheme('invalid-theme')
      })

      expect(result.current.theme).toBe(DEFAULT_THEME)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('localStorage loading', () => {
    it('loads valid theme from storage on mount', () => {
      localStorageMock.setItem('terminal-theme', 'tokyonight')
      localStorageMock.setItem.mockClear()

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('tokyonight')
      expect(setPropertyMock).toHaveBeenCalledWith('--background', THEMES['tokyonight'].background)
    })

    it('falls back to default when storage has invalid theme', () => {
      localStorageMock.setItem('terminal-theme', 'not-a-real-theme')
      localStorageMock.setItem.mockClear()

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(DEFAULT_THEME)
    })

    it('falls back to default when storage is empty', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(DEFAULT_THEME)
    })
  })

  describe('all themes are valid', () => {
    const themeNames: ThemeName[] = ['lumon', 'tokyonight', 'dracula', 'gruvbox', 'nord', 'monokai']

    themeNames.forEach(themeName => {
      it(`can set theme to ${themeName}`, () => {
        const { result } = renderHook(() => useTheme())

        act(() => {
          result.current.setTheme(themeName)
        })

        expect(result.current.theme).toBe(themeName)
        expect(result.current.themeConfig).toEqual(THEMES[themeName])
      })
    })
  })
})
