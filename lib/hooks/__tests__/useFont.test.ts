import { renderHook, act } from '@testing-library/react'
import { useFont } from '../useFont'
import { DEFAULT_FONT, FONTS } from '@/lib/data/fonts'
import type { FontName } from '@/lib/types/terminal'

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

describe('useFont', () => {
  describe('initial state', () => {
    it('returns default font initially', () => {
      const { result } = renderHook(() => useFont())

      expect(result.current.font).toBe(DEFAULT_FONT)
    })

    it('returns correct fontConfig for default font', () => {
      const { result } = renderHook(() => useFont())

      expect(result.current.fontConfig).toEqual(FONTS[DEFAULT_FONT])
    })

    it('returns all available fonts', () => {
      const { result } = renderHook(() => useFont())

      expect(result.current.availableFonts).toEqual(Object.keys(FONTS))
      expect(result.current.availableFonts).toContain('jetbrains')
      expect(result.current.availableFonts).toContain('fira')
    })

    it('applies default font CSS on mount', () => {
      renderHook(() => useFont())

      expect(setPropertyMock).toHaveBeenCalledWith('--font-mono', FONTS[DEFAULT_FONT].value)
    })
  })

  describe('setFont', () => {
    it('updates font state', () => {
      const { result } = renderHook(() => useFont())

      act(() => {
        result.current.setFont('fira')
      })

      expect(result.current.font).toBe('fira')
    })

    it('updates fontConfig when font changes', () => {
      const { result } = renderHook(() => useFont())

      act(() => {
        result.current.setFont('source')
      })

      expect(result.current.fontConfig).toEqual(FONTS['source'])
    })

    it('persists font to localStorage', () => {
      const { result } = renderHook(() => useFont())

      act(() => {
        result.current.setFont('ibm')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('terminal-font', 'ibm')
    })

    it('applies CSS variable when font changes', () => {
      const { result } = renderHook(() => useFont())

      vi.clearAllMocks()

      act(() => {
        result.current.setFont('hack')
      })

      expect(setPropertyMock).toHaveBeenCalledWith('--font-mono', FONTS['hack'].value)
    })

    it('ignores invalid font name', () => {
      const { result } = renderHook(() => useFont())

      act(() => {
        // @ts-expect-error - testing invalid input
        result.current.setFont('invalid-font')
      })

      expect(result.current.font).toBe(DEFAULT_FONT)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('localStorage loading', () => {
    it('loads valid font from storage on mount', () => {
      localStorageMock.setItem('terminal-font', 'fira')
      localStorageMock.setItem.mockClear()

      const { result } = renderHook(() => useFont())

      expect(result.current.font).toBe('fira')
      expect(setPropertyMock).toHaveBeenCalledWith('--font-mono', FONTS['fira'].value)
    })

    it('falls back to default when storage has invalid font', () => {
      localStorageMock.setItem('terminal-font', 'not-a-real-font')
      localStorageMock.setItem.mockClear()

      const { result } = renderHook(() => useFont())

      expect(result.current.font).toBe(DEFAULT_FONT)
    })

    it('falls back to default when storage is empty', () => {
      const { result } = renderHook(() => useFont())

      expect(result.current.font).toBe(DEFAULT_FONT)
    })
  })

  describe('all fonts are valid', () => {
    const fontNames: FontName[] = ['jetbrains', 'fira', 'source', 'ibm', 'hack', 'mono']

    fontNames.forEach(fontName => {
      it(`can set font to ${fontName}`, () => {
        const { result } = renderHook(() => useFont())

        act(() => {
          result.current.setFont(fontName)
        })

        expect(result.current.font).toBe(fontName)
        expect(result.current.fontConfig).toEqual(FONTS[fontName])
      })
    })
  })
})
