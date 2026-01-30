import type { TerminalLine } from '@/lib/types/terminal'

// Token types for syntax highlighting
export type TokenType =
  | 'command'
  | 'invalid'
  | 'path'
  | 'string'
  | 'flag'
  | 'number'
  | 'argument'
  | 'space'
  | 'text'

export interface Token {
  type: TokenType
  value: string
}

// Props for TerminalLine component
export interface TerminalLineProps {
  line: TerminalLine
}

// Valid commands list extracted from terminal.tsx
export const VALID_COMMANDS = [
  'ls',
  'cd',
  'pwd',
  'cat',
  'view',
  'man',
  'help',
  'search',
  'genre',
  'format',
  'type',
  'game',
  'suggest',
  'notes',
  'theme',
  'font',
  'neofetch',
  'mkdir',
  'touch',
  'rm',
  'about',
  'contact',
  'projects',
  'clear',
  'whoami',
  'date',
  'echo',
  'exit',
  'sudo',
] as const

// Header keywords for highlightLine
export const HEADER_KEYWORDS = [
  'NAME',
  'SYNOPSIS',
  'DESCRIPTION',
  'EXAMPLES',
  'EXAMPLE',
  'SEE ALSO',
  'COMMANDS',
  'GAMES',
  'THEMES',
  'FONTS',
  'NAVIGATION',
  'COLLECTIONS',
  'FILES',
  'INFO',
  'OTHER',
  'STYLE',
  'BLOG',
  'UPDATES',
] as const
