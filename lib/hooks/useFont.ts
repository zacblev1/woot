import { useState, useEffect, useCallback } from 'react'
import type { FontName, FontConfig } from '@/lib/types/terminal'
import { FONTS, DEFAULT_FONT, isValidFont, applyFont } from '@/lib/data/fonts'

const STORAGE_KEY = 'terminal-font'

export interface UseFontReturn {
  font: FontName
  fontConfig: FontConfig
  setFont: (name: FontName) => void
  availableFonts: FontName[]
}

export function useFont(): UseFontReturn {
  const [font, setFontState] = useState<FontName>(DEFAULT_FONT)

  // Load from localStorage after mount (SSR-safe)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isValidFont(saved)) {
      setFontState(saved)
      applyFont(saved)
    } else {
      // Apply default font on mount
      applyFont(DEFAULT_FONT)
    }
  }, [])

  const setFont = useCallback((name: FontName) => {
    if (!isValidFont(name)) return
    setFontState(name)
    localStorage.setItem(STORAGE_KEY, name)
    applyFont(name)
  }, [])

  return {
    font,
    fontConfig: FONTS[font],
    setFont,
    availableFonts: Object.keys(FONTS) as FontName[],
  }
}
