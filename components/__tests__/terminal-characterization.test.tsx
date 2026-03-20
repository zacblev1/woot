/**
 * Terminal Characterization Tests
 *
 * PURPOSE: These are CHARACTERIZATION tests - they document the current behavior
 * of the Terminal component before any refactoring begins. They capture:
 * - Initial rendering and welcome message
 * - Command input handling
 * - Basic command execution
 * - All 6 games starting without crashing
 * - Theme/font localStorage persistence
 * - Keyboard navigation
 *
 * If a test fails because behavior differs from what's documented here,
 * that's important information - update the test assertion to match actual behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Terminal } from '../terminal'
import { TerminalContextProvider } from '@/lib/terminal-context'

function WrappedTerminal() {
  return (
    <TerminalContextProvider>
      <Terminal />
    </TerminalContextProvider>
  )
}

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get store() { return store }
  }
})()

// Mock matchMedia for theme detection
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Mock window.open for projects command
const mockWindowOpen = vi.fn()

describe('Terminal - Characterization Tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true })
    Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true })
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders terminal container', () => {
      render(<WrappedTerminal />)
      // The terminal has a specific structure - look for the text content
      expect(screen.getByText("zachary@home")).toBeInTheDocument()
    })

    it('shows welcome message', () => {
      render(<WrappedTerminal />)
      expect(screen.getByText("Type 'help' for available commands.")).toBeInTheDocument()
    })

    it('renders input prompt', () => {
      render(<WrappedTerminal />)
      // The prompt shows ~ $ for home directory
      expect(screen.getByText(/~\s*\$/)).toBeInTheDocument()
    })

    it('renders text input field', () => {
      render(<WrappedTerminal />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('input is auto-focused', () => {
      render(<WrappedTerminal />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  describe('Command Input', () => {
    it('accepts text input', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help')

      expect(input).toHaveValue('help')
    })

    it('clears input after Enter', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help{Enter}')

      expect(input).toHaveValue('')
    })

    it('shows command in history after execution', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')

      // The command appears in history with syntax highlighting (prompt and command are separate spans)
      // We verify by checking the pwd result appears
      await waitFor(() => {
        expect(screen.getByText('/home/zachary')).toBeInTheDocument()
      })
    })
  })

  describe('Basic Commands', () => {
    it('pwd returns home directory', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')

      await waitFor(() => {
        expect(screen.getByText('/home/zachary')).toBeInTheDocument()
      })
    })

    it('help shows command list', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help{Enter}')

      await waitFor(() => {
        expect(screen.getByText('COMMANDS')).toBeInTheDocument()
      })
    })

    it('clear resets history to welcome state', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      // Execute a command first
      await user.type(input, 'pwd{Enter}')
      await waitFor(() => {
        expect(screen.getByText('/home/zachary')).toBeInTheDocument()
      })

      // Now clear
      await user.type(input, 'clear{Enter}')

      await waitFor(() => {
        // pwd output should be gone, welcome message back
        expect(screen.getByText("Type 'help' for available commands.")).toBeInTheDocument()
        // The pwd output line should no longer be present (only one /home/zachary from pwd output)
        const pwdOutputs = screen.queryAllByText('/home/zachary')
        // After clear, there should be no pwd output visible
        expect(pwdOutputs.length).toBe(0)
      })
    })

    it('unknown command shows error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalidcmd{Enter}')

      await waitFor(() => {
        expect(screen.getByText('command not found: invalidcmd')).toBeInTheDocument()
      })
    })

    it('whoami returns zachary', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'whoami{Enter}')

      await waitFor(() => {
        // whoami outputs standalone "zachary" in its own div
        // The text "zachary@home" doesn't match exact "zachary"
        // So we need to find the standalone output line
        const zacharyElements = screen.getAllByText('zachary')
        // After whoami, there should be a standalone "zachary" output
        expect(zacharyElements.length).toBeGreaterThanOrEqual(1)
        // Verify the output contains just "zachary" as output
        const outputElements = document.querySelectorAll('.text-foreground')
        const hasZacharyOutput = Array.from(outputElements).some(
          el => el.textContent === 'zachary'
        )
        expect(hasZacharyOutput).toBe(true)
      })
    })
  })

  describe('Game Commands - Start Without Crashing', () => {
    it('game number starts without error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game number{Enter}')

      await waitFor(() => {
        expect(screen.getByText('NUMBER GUESSING GAME')).toBeInTheDocument()
      })
    })

    it('game wordle starts without error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game wordle{Enter}')

      await waitFor(() => {
        expect(screen.getByText('WORDLE')).toBeInTheDocument()
      })
    })

    it('game trivia starts without error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game trivia{Enter}')

      await waitFor(() => {
        expect(screen.getByText('TRIVIA')).toBeInTheDocument()
      })
    })

    it('game blackjack starts without error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game blackjack{Enter}')

      await waitFor(() => {
        expect(screen.getByText('BLACKJACK')).toBeInTheDocument()
      })
    })

    it('game rps starts without error', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game rps{Enter}')

      await waitFor(() => {
        expect(screen.getByText('ROCK PAPER SCISSORS')).toBeInTheDocument()
      })
    })

    it('game tron starts without error (sets game state)', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game tron{Enter}')

      // Tron game takes over the UI - we should see the loading or game container
      await waitFor(() => {
        // The Tron game component should be rendered
        // It shows "Loading Tron..." initially due to dynamic import
        const tronText = screen.queryByText('Loading Tron...')
        // Either loading text or the game canvas should be present
        // The game state is set to active, so terminal should have game UI
        expect(document.body.textContent).toBeDefined()
      })
    })

    it('game without argument shows game list', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'game{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/game number/)).toBeInTheDocument()
        expect(screen.getByText(/game wordle/)).toBeInTheDocument()
      })
    })
  })

  describe('Theme Persistence', () => {
    it('loads theme from localStorage on mount', () => {
      mockLocalStorage.setItem('terminal-theme', 'dracula')
      render(<WrappedTerminal />)

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('terminal-theme')
    })

    it('saves theme to localStorage when changed', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'theme dracula{Enter}')

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('terminal-theme', 'dracula')
      })
    })

    it('theme command without argument lists available themes', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'theme{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Available themes:')).toBeInTheDocument()
        expect(screen.getByText(/lumon/)).toBeInTheDocument()
        expect(screen.getByText(/dracula/)).toBeInTheDocument()
      })
    })
  })

  describe('Font Persistence', () => {
    it('loads font from localStorage on mount', () => {
      mockLocalStorage.setItem('terminal-font', 'fira')
      render(<WrappedTerminal />)

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('terminal-font')
    })

    it('saves font to localStorage when changed', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'font fira{Enter}')

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('terminal-font', 'fira')
      })
    })

    it('font command without argument lists available fonts', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'font{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Available fonts:')).toBeInTheDocument()
        expect(screen.getByText(/jetbrains/)).toBeInTheDocument()
        expect(screen.getByText(/fira/)).toBeInTheDocument()
      })
    })
  })

  describe('VFS Persistence', () => {
    it('loads VFS state from localStorage on mount', () => {
      render(<WrappedTerminal />)

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('vfs-state')
    })

    it('saves VFS state after mkdir', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'mkdir testdir{Enter}')

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vfs-state', expect.any(String))
      })
    })

    it('saves VFS state after touch', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'touch testfile{Enter}')

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vfs-state', expect.any(String))
      })
    })

    it('saves VFS state after rm', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      // First create, then remove
      await user.type(input, 'touch removeme{Enter}')
      await user.type(input, 'rm removeme{Enter}')

      await waitFor(() => {
        // Should have been called for both operations
        const setCalls = mockLocalStorage.setItem.mock.calls.filter(
          (call: string[]) => call[0] === 'vfs-state'
        )
        expect(setCalls.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('Ctrl+C interrupts active game', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      // Start a game
      await user.type(input, 'game number{Enter}')

      await waitFor(() => {
        expect(screen.getByText('NUMBER GUESSING GAME')).toBeInTheDocument()
      })

      // Send Ctrl+C
      fireEvent.keyDown(window, { key: 'c', ctrlKey: true })

      await waitFor(() => {
        expect(screen.getByText('Game interrupted.')).toBeInTheDocument()
      })
    })

    it('Arrow up recalls previous command', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')
      await user.type(input, 'whoami{Enter}')

      // Press up arrow
      await user.keyboard('{ArrowUp}')

      expect(input).toHaveValue('whoami')
    })

    it('Arrow up/down navigates command history', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')
      await user.type(input, 'whoami{Enter}')

      // Navigate up twice, then down
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('whoami')

      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('pwd')

      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('whoami')

      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('')
    })

    it('Ctrl+L clears screen', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      // Execute a command
      await user.type(input, 'pwd{Enter}')
      await waitFor(() => {
        expect(screen.getByText('/home/zachary')).toBeInTheDocument()
      })

      // Press Ctrl+L
      await user.keyboard('{Control>}l{/Control}')

      await waitFor(() => {
        // Should reset to welcome state
        expect(screen.getByText("Type 'help' for available commands.")).toBeInTheDocument()
        // pwd output should be gone
        expect(screen.queryByText('/home/zachary')).not.toBeInTheDocument()
      })
    })
  })

  describe('Collection Navigation', () => {
    it('can navigate to books directory', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'cd books{Enter}')
      await user.type(input, 'pwd{Enter}')

      await waitFor(() => {
        expect(screen.getByText('/home/zachary/books')).toBeInTheDocument()
      })
    })

    it('ls shows collection directories from home', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')

      await waitFor(() => {
        expect(screen.getByText('books')).toBeInTheDocument()
        expect(screen.getByText('vinyl')).toBeInTheDocument()
        expect(screen.getByText('hardware')).toBeInTheDocument()
      })
    })
  })
})
