import { fonts, type FontName, type FontConfig } from '@/lib/terminal-config'

// Single source of truth lives in lib/terminal-config.ts (font families are
// self-hosted via next/font CSS variables defined in app/layout.tsx).
export const FONTS: Record<FontName, FontConfig> = fonts

export const DEFAULT_FONT: FontName = 'jetbrains'

export function isValidFont(name: string): name is FontName {
  return name in FONTS
}

export function applyFont(name: FontName): void {
  const font = FONTS[name]
  if (!font || typeof document === 'undefined') return

  document.documentElement.style.setProperty('--font-mono', font.value)
}
