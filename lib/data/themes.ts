import type { ThemeName, ThemeColors } from '@/lib/terminal-config'

export const THEMES: Record<ThemeName, ThemeColors> = {
  lumon: {
    name: 'Lumon',
    background: '#0a1628',
    foreground: '#e8f4f8',
    card: '#0d1e36',
    primary: '#4fd1c5',
    muted: '#94a3b8',
    accent: '#4fd1c5',
    destructive: '#f56565',
    border: '#2d4a6f',
  },
  tokyonight: {
    name: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#c0caf5',
    card: '#1a1b26',
    primary: '#7aa2f7',
    muted: '#565f89',
    accent: '#9ece6a',
    destructive: '#f7768e',
    border: '#3b4261',
  },
  dracula: {
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    card: '#282a36',
    primary: '#bd93f9',
    muted: '#6272a4',
    accent: '#50fa7b',
    destructive: '#ff5555',
    border: '#44475a',
  },
  gruvbox: {
    name: 'Gruvbox',
    background: '#282828',
    foreground: '#ebdbb2',
    card: '#282828',
    primary: '#fabd2f',
    muted: '#928374',
    accent: '#b8bb26',
    destructive: '#fb4934',
    border: '#3c3836',
  },
  nord: {
    name: 'Nord',
    background: '#2e3440',
    foreground: '#eceff4',
    card: '#2e3440',
    primary: '#88c0d0',
    muted: '#4c566a',
    accent: '#a3be8c',
    destructive: '#bf616a',
    border: '#3b4252',
  },
  monokai: {
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    card: '#272822',
    primary: '#66d9ef',
    muted: '#75715e',
    accent: '#a6e22e',
    destructive: '#f92672',
    border: '#3e3d32',
  },
}

export const DEFAULT_THEME: ThemeName = 'lumon'

export function isValidTheme(name: string): name is ThemeName {
  return name in THEMES
}

export function applyTheme(name: ThemeName): void {
  const theme = THEMES[name]
  if (!theme || typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--foreground', theme.foreground)
  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--destructive', theme.destructive)
  root.style.setProperty('--border', theme.border)
}
