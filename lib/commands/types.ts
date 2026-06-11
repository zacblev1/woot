// Re-export existing types from terminal.ts
export type {
  CommandResult,
  CommandSuccess,
  CommandError,
  CommandOutput,
  TerminalLine,
  TerminalLineType,
  ThemeName,
  FontName,
} from '@/lib/types/terminal'

// Re-export game types
export type { GameType } from '@/lib/types/games'

// Import types needed for interfaces
import type { TerminalLine, ThemeName, FontName } from '@/lib/types/terminal'
import type { GameType } from '@/lib/types/games'
import type { FileSystemNode as VFSNode } from '@/lib/vfs'

/**
 * Extended context passed to command execution.
 * Commands receive this interface for all dependencies,
 * enabling testing via mock context objects.
 */
export interface ExecuteContext {
  vfs: {
    pwd: () => string
    cd: (path: string) => string | null
    ls: (path?: string) => string[]
    resolve: (path: string) => VFSNode | null
    mkdir: (path: string) => string | null
    touch: (path: string) => string | null
    rm: (path: string) => string | null
  }
  history: {
    add: (line: TerminalLine) => void
    clear: () => void
    /** Submitted command strings, oldest first (for `history` and `!!`). */
    commands: () => string[]
  }
  /** Lines piped from the previous pipeline stage (filter commands only). */
  stdin?: string[]
  game: {
    /**
     * Start a game. Returns the intro text for text-based games
     * (the terminal owns the game state machine); canvas games
     * return nothing and take over the UI.
     */
    start: (type: GameType, args?: string[]) => import('@/lib/types/terminal').CommandOutput | void
    end: () => void
    isActive: () => boolean
  }
  sound: {
    enabled: boolean
    toggle: () => void
  }
  /** Milliseconds since the terminal mounted (used by neofetch). */
  uptime: () => number
  theme: {
    current: ThemeName
    set: (name: ThemeName) => void
    list: () => ThemeName[]
    config: (name: ThemeName) => { name: string }
  }
  font: {
    current: FontName
    set: (name: FontName) => void
    list: () => FontName[]
    config: (name: FontName) => { name: string }
  }
  // Additional context
  currentDirectory: string // Display path like "~" or "~/books"
  setCurrentDirectory: (path: string) => void
  openUrl: (url: string) => void
  // Collection data for search/genre/format/type commands
  collections: {
    books: Array<{
      title: string
      author: string | string[]
      genre: string
      format: string
      pages?: number | string
    }>
    vinyl: Array<{
      title: string
      artist: string
      genre: string
      format: string
      label: string
    }>
    hardware: Array<{
      name: string
      type: string
      processor: string
      memory: string
      storage: string
      status: string
      graphics?: string
      operating_system?: string
    }>
    notes: Array<{
      title: string
      date: string
      author: string
      content: string[]
    }>
  }
}

/**
 * Definition for a terminal command.
 * Commands are pure functions that receive context and return results.
 */
export interface CommandDefinition {
  name: string
  description: string
  usage: string
  /** Filter commands consume context.stdin and may appear after a `|`. */
  filter?: boolean
  execute: (
    args: string[],
    context: ExecuteContext
  ) => import('@/lib/types/terminal').CommandResult | Promise<import('@/lib/types/terminal').CommandResult>
}

/**
 * Helper to create a success result
 */
export function success(output: import('@/lib/types/terminal').CommandOutput): import('@/lib/types/terminal').CommandSuccess {
  return { success: true, output }
}

/**
 * Helper to create an error result
 */
export function error(message: string): import('@/lib/types/terminal').CommandError {
  return { success: false, error: message }
}
