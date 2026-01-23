import { useState, useEffect, useCallback } from 'react'
import type { ThemeName, ThemeColors } from '@/lib/types/terminal'
import { THEMES, DEFAULT_THEME, isValidTheme, applyTheme } from '@/lib/data/themes'

const STORAGE_KEY = 'terminal-theme'

export interface UseThemeReturn {
  theme: ThemeName
  themeConfig: ThemeColors
  setTheme: (name: ThemeName) => void
  availableThemes: ThemeName[]
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME)

  // Load from localStorage after mount (SSR-safe)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isValidTheme(saved)) {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      // Apply default theme on mount
      applyTheme(DEFAULT_THEME)
    }
  }, [])

  const setTheme = useCallback((name: ThemeName) => {
    if (!isValidTheme(name)) return
    setThemeState(name)
    localStorage.setItem(STORAGE_KEY, name)
    applyTheme(name)
  }, [])

  return {
    theme,
    themeConfig: THEMES[theme],
    setTheme,
    availableThemes: Object.keys(THEMES) as ThemeName[],
  }
}
