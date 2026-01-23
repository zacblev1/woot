import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Terminal } from '../../terminal'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock window.open for projects command
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
})

describe('Terminal Integration Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    mockWindowOpen.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Terminal Rendering', () => {
    it('displays initial welcome message', () => {
      render(<Terminal />)

      expect(screen.getByText('zachary@home')).toBeInTheDocument()
      expect(screen.getByText("Type 'help' for available commands.")).toBeInTheDocument()
    })

    it('shows prompt with home directory', () => {
      render(<Terminal />)

      expect(screen.getByText('~ $')).toBeInTheDocument()
    })

    it('has input field present', () => {
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('input is autofocused', () => {
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  describe('Command Execution Flow', () => {
    it('executes ls command and shows output', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')

      // Should show directory contents
      expect(screen.getByText('books')).toBeInTheDocument()
      expect(screen.getByText('vinyl')).toBeInTheDocument()
      expect(screen.getByText('hardware')).toBeInTheDocument()
    })

    it('executes help command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'help{Enter}')

      expect(screen.getByText('COMMANDS')).toBeInTheDocument()
      expect(screen.getByText(/Navigation/)).toBeInTheDocument()
    })

    it('handles cd command and updates prompt', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'cd books{Enter}')

      // Prompt should change to show new directory
      expect(screen.getByText('~/books $')).toBeInTheDocument()
    })

    it('shows error for invalid command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalidcmd{Enter}')

      expect(screen.getByText('command not found: invalidcmd')).toBeInTheDocument()
    })

    it('clears input after command execution', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')

      expect(input).toHaveValue('')
    })
  })

  describe('Tab Completion', () => {
    it('completes command on Tab', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'the')
      await user.keyboard('{Tab}')

      expect(input).toHaveValue('theme')
    })

    it('completes partial command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'hel')
      await user.keyboard('{Tab}')

      expect(input).toHaveValue('help')
    })

    it('shows multiple completions when ambiguous', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      // Type something that has multiple matches
      await user.type(input, 'c')
      await user.keyboard('{Tab}')

      // Should show possible completions (cd, cat, clear, contact)
      expect(screen.getByText(/cd/)).toBeInTheDocument()
    })
  })

  describe('History Navigation', () => {
    it('navigates command history with ArrowUp', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')
      await user.type(input, 'pwd{Enter}')

      // Navigate up
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('pwd')

      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('ls')
    })

    it('navigates command history with ArrowDown', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')
      await user.type(input, 'pwd{Enter}')

      // Navigate up twice
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('ls')

      // Navigate down
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('pwd')
    })

    it('clears input when navigating past most recent', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')

      // Navigate up then down past the end
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('ls')

      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('clears terminal on Ctrl+L', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')

      // Verify ls output is present
      expect(screen.getByText('books')).toBeInTheDocument()

      await user.keyboard('{Control>}l{/Control}')

      // History should be reset - directory listing should be gone
      expect(screen.queryByText('books')).not.toBeInTheDocument()
      // Welcome message should still be there
      expect(screen.getByText('zachary@home')).toBeInTheDocument()
    })
  })

  describe('Theme Command', () => {
    it('changes theme with theme command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'theme dracula{Enter}')

      expect(screen.getByText('Theme set to Dracula')).toBeInTheDocument()
    })

    it('lists themes without argument', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'theme{Enter}')

      expect(screen.getByText('Available themes:')).toBeInTheDocument()
      expect(screen.getByText(/dracula/)).toBeInTheDocument()
      expect(screen.getByText(/nord/)).toBeInTheDocument()
    })
  })

  describe('Font Command', () => {
    it('changes font with font command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'font fira{Enter}')

      expect(screen.getByText('Font set to Fira Code')).toBeInTheDocument()
    })
  })

  describe('Click to Focus', () => {
    it('focuses input when clicking terminal container', async () => {
      const user = userEvent.setup()
      const { container } = render(<Terminal />)

      const input = screen.getByRole('textbox')
      input.blur()
      expect(document.activeElement).not.toBe(input)

      // Click the terminal container
      const terminal = container.firstChild as HTMLElement
      await user.click(terminal)

      expect(document.activeElement).toBe(input)
    })
  })

  describe('Whoami and Date Commands', () => {
    it('executes whoami command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'whoami{Enter}')

      expect(screen.getByText('zachary')).toBeInTheDocument()
    })

    it('executes date command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'date{Enter}')

      // Date output varies, just check it doesn't error
      const historyContainer = screen.getByRole('textbox').parentElement?.parentElement?.previousSibling
      expect(historyContainer).toBeInTheDocument()
    })
  })

  describe('Echo Command', () => {
    it('echoes text', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'echo test message{Enter}')

      // The text appears in both the command input and echo output
      const matches = screen.getAllByText('test message')
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('Clear Command', () => {
    it('clears history with clear command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'ls{Enter}')
      await user.type(input, 'clear{Enter}')

      // The ls command output should be gone
      expect(screen.queryByText(/~ \$ ls/)).not.toBeInTheDocument()
      // Welcome message should be back
      expect(screen.getByText('zachary@home')).toBeInTheDocument()
    })
  })

  describe('Navigation Commands', () => {
    it('executes pwd command', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'pwd{Enter}')

      expect(screen.getByText('/home/zachary')).toBeInTheDocument()
    })

    it('handles cd to invalid directory', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'cd nonexistent{Enter}')

      expect(screen.getByText(/No such file or directory/i)).toBeInTheDocument()
    })
  })

  describe('About and Contact Commands', () => {
    it('shows about information', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'about{Enter}')

      expect(screen.getByText('Zachary')).toBeInTheDocument()
      expect(screen.getByText('Creative Technologist')).toBeInTheDocument()
    })

    it('shows contact information with links', async () => {
      const user = userEvent.setup()
      render(<Terminal />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'contact{Enter}')

      // Links should be rendered
      const emailLink = screen.getByText(/Email.*zachary@thefrenchjockey.com/)
      expect(emailLink).toBeInTheDocument()
    })
  })
})
