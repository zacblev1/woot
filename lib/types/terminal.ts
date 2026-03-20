import type { GameType } from './games'
import type { ThemeName, FontName } from '@/lib/terminal-config'

export type { ThemeName, FontName }

// Terminal line types
export type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'link' | 'wordle' | 'image' | 'banner'

export interface TerminalLine {
  type: TerminalLineType
  content: string
  href?: string // Only for type: 'link'
  src?: string
  centered?: boolean
}

// Command execution result variants
export type CommandOutput = string | string[] | TerminalLine | TerminalLine[]

export interface CommandSuccess {
  success: true
  output: CommandOutput
}

export interface CommandError {
  success: false
  error: string
}

export type CommandResult = CommandSuccess | CommandError

// Command definition for registry
export interface CommandDefinition {
  name: string
  description: string
  usage: string
  execute: (args: string[], context: CommandContext) => CommandResult
}

// Context passed to commands
export interface CommandContext {
  vfs: {
    pwd: () => string
    cd: (path: string) => string | null
    ls: (path?: string) => string[]
    resolve: (path: string) => unknown // Will be VFSNode | null
    mkdir: (path: string) => string | null
    touch: (path: string) => string | null
    rm: (path: string) => string | null
  }
  history: {
    add: (line: TerminalLine) => void
    clear: () => void
  }
  game: {
    start: (type: GameType) => void
    end: () => void
  }
  theme: {
    current: ThemeName
    set: (name: ThemeName) => void
  }
  font: {
    current: FontName
    set: (name: FontName) => void
  }
}

// Input handling
export interface InputState {
  value: string
  cursorPosition: number
  historyIndex: number
}
