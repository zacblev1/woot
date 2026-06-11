export const themes = {
  midnight: {
    name: "Midnight",
    background: "#0a1628",
    foreground: "#e8f4f8",
    card: "#0d1e36",
    primary: "#4fd1c5",
    muted: "#94a3b8",
    accent: "#4fd1c5",
    destructive: "#f56565",
    border: "#2d4a6f",
  },
  tokyonight: {
    name: "Tokyo Night",
    background: "#1a1b26",
    foreground: "#c0caf5",
    card: "#1a1b26",
    primary: "#7aa2f7",
    muted: "#565f89",
    accent: "#9ece6a",
    destructive: "#f7768e",
    border: "#3b4261",
  },
  dracula: {
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    card: "#282a36",
    primary: "#bd93f9",
    muted: "#6272a4",
    accent: "#50fa7b",
    destructive: "#ff5555",
    border: "#44475a",
  },
  gruvbox: {
    name: "Gruvbox",
    background: "#282828",
    foreground: "#ebdbb2",
    card: "#282828",
    primary: "#fabd2f",
    muted: "#928374",
    accent: "#b8bb26",
    destructive: "#fb4934",
    border: "#3c3836",
  },
  nord: {
    name: "Nord",
    background: "#2e3440",
    foreground: "#eceff4",
    card: "#2e3440",
    primary: "#88c0d0",
    muted: "#4c566a",
    accent: "#a3be8c",
    destructive: "#bf616a",
    border: "#3b4252",
  },
  monokai: {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    card: "#272822",
    primary: "#66d9ef",
    muted: "#75715e",
    accent: "#a6e22e",
    destructive: "#f92672",
    border: "#3e3d32",
  },
  phosphor: {
    name: "Phosphor",
    background: "#050f05",
    foreground: "#c8facc",
    card: "#0a1a0a",
    primary: "#33ff66",
    muted: "#4d805d",
    accent: "#66ff99",
    destructive: "#ff5555",
    border: "#1a4d2a",
  },
} as const

// Hidden theme: unlocked via the Konami code (see Terminal's keydown listener)
export const HIDDEN_THEMES: readonly (keyof typeof themes)[] = ['phosphor']

export type ThemeName = keyof typeof themes

// Font families are self-hosted via next/font in app/layout.tsx and exposed
// as CSS variables; `hack` relies on a locally installed font with a system
// monospace fallback.
export const fonts = {
  jetbrains: { name: "JetBrains Mono", value: 'var(--font-jetbrains-mono), monospace' },
  fira: { name: "Fira Code", value: 'var(--font-fira-code), monospace' },
  source: { name: "Source Code Pro", value: 'var(--font-source-code-pro), monospace' },
  ibm: { name: "IBM Plex Mono", value: 'var(--font-ibm-plex-mono), monospace' },
  hack: { name: "Hack", value: '"Hack", monospace' },
  mono: { name: "System Mono", value: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace' },
} as const

export type FontName = keyof typeof fonts

export type ThemeColors = typeof themes[ThemeName]
export type FontConfig = typeof fonts[FontName]

export const GAME_NAMES = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball'] as const

export const COMMAND_DESCRIPTIONS: Record<string, string> = {
  grep: 'Filter piped lines by substring',
  head: 'First n piped lines',
  tail: 'Last n piped lines',
  wc: 'Count piped lines',
  sort: 'Sort piped lines',
  history: 'Show command history',
  cowsay: 'A cow says things',
  stats: 'Collection statistics as bar charts',
  tour: 'Guided demo of the terminal',
  highscores: 'Arcade leaderboards',
  ls: 'List directory contents',
  cd: 'Change directory',
  pwd: 'Print working directory',
  cat: 'Display file contents',
  view: 'Formatted view of a file',
  man: 'Display manual pages',
  help: 'Show available commands',
  search: 'Search collections',
  genre: 'Filter by genre',
  format: 'Filter by format',
  type: 'Filter by type',
  game: 'Play a game',
  suggest: 'Submit a game suggestion',
  notes: 'View blog posts and updates',
  theme: 'Switch terminal theme',
  font: 'Switch terminal font',
  sound: 'Toggle sound effects',
  neofetch: 'Display system info',
  mkdir: 'Create a directory',
  touch: 'Create a file',
  rm: 'Remove a file or directory',
  about: 'About Zachary',
  contact: 'Contact information',
  projects: 'View projects on GitHub',
  clear: 'Clear terminal',
  whoami: 'Print current user',
  date: 'Print current date and time',
  echo: 'Echo text',
  exit: 'Exit terminal',
  sudo: 'Run as superuser',
}
