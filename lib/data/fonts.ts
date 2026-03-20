import type { FontName, FontConfig } from '@/lib/terminal-config'

export const FONTS: Record<FontName, FontConfig> = {
  jetbrains: {
    name: 'JetBrains Mono',
    value: '"JetBrains Mono", monospace',
  },
  fira: {
    name: 'Fira Code',
    value: '"Fira Code", monospace',
  },
  source: {
    name: 'Source Code Pro',
    value: '"Source Code Pro", monospace',
  },
  ibm: {
    name: 'IBM Plex Mono',
    value: '"IBM Plex Mono", monospace',
  },
  hack: {
    name: 'Hack',
    value: '"Hack", monospace',
  },
  mono: {
    name: 'System Mono',
    value: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
}

export const DEFAULT_FONT: FontName = 'jetbrains'

export function isValidFont(name: string): name is FontName {
  return name in FONTS
}

export function applyFont(name: FontName): void {
  const font = FONTS[name]
  if (!font || typeof document === 'undefined') return

  document.documentElement.style.setProperty('--font-mono', font.value)
}
