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

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

// Reduced motion ON so timed scripts (sl, meltdown) render instantly in tests
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

describe('terminal easter eggs', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true })
    mockLocalStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sl drives a train through the terminal', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'sl{Enter}')
    await waitFor(() => {
      // distinctive glyph run from the locomotive (whitespace-free: getByText normalizes spaces)
      expect(screen.getByText(/I_I_____===__/)).toBeInTheDocument()
    })
  })

  it('rm -rf / melts down and reboots to the banner', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'pwd{Enter}')
    await user.type(screen.getByRole('textbox'), 'rm -rf /{Enter}')
    await waitFor(() => {
      expect(screen.getByText(/KERNEL PANIC/)).toBeInTheDocument()
    })
    // reboot resets history: pwd output is gone, banner is back
    await waitFor(() => {
      expect(screen.queryByText('/home/zachary')).not.toBeInTheDocument()
      expect(screen.getByText(/developer.*collector.*gamer/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('vim traps the user until :q!', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'vim{Enter}')
    await waitFor(() => expect(screen.getByText(/VIM - Vi IMproved/)).toBeInTheDocument())
    await user.type(input, 'exit{Enter}')
    await waitFor(() => expect(screen.getByText(/E492: Not an editor command: exit/)).toBeInTheDocument())
    await user.type(input, ':q!{Enter}')
    await waitFor(() => expect(screen.getByText(/you are free now/)).toBeInTheDocument())
    // commands work again
    await user.type(input, 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
  })

  describe('konami / phosphor', () => {
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

    it('phosphor is hidden from the theme list before unlock', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)
      await user.type(screen.getByRole('textbox'), 'theme{Enter}')
      await waitFor(() => expect(screen.getByText('Available themes:')).toBeInTheDocument())
      expect(screen.queryByText(/phosphor/)).not.toBeInTheDocument()
    })

    it('konami code unlocks phosphor', async () => {
      const user = userEvent.setup()
      render(<WrappedTerminal />)
      for (const key of KONAMI) fireEvent.keyDown(window, { key })
      await waitFor(() => expect(screen.getByText(/PHOSPHOR MODE UNLOCKED/)).toBeInTheDocument())
      await user.type(screen.getByRole('textbox'), 'theme phosphor{Enter}')
      await waitFor(() => expect(screen.getByText('Theme set to Phosphor')).toBeInTheDocument())
    })
  })

  it('input typed during the meltdown is swallowed, not executed', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'rm -rf /{Enter}')
    // reduced motion: panic prints instantly, but the reboot timer is still pending
    await waitFor(() => expect(screen.getByText(/KERNEL PANIC/)).toBeInTheDocument())
    await user.type(input, 'cd books{Enter}')
    // the reboot is signalled by the panic line being wiped from history
    await waitFor(() => {
      expect(screen.queryByText(/KERNEL PANIC/)).not.toBeInTheDocument()
    }, { timeout: 3000 })
    // the cd was swallowed: pwd shows home, not ~/books
    await user.type(input, 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
    expect(screen.queryByText('/home/zachary/books')).not.toBeInTheDocument()
  })

  it('easter eggs do not hijack input during a text game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'game number{Enter}')
    await waitFor(() => expect(screen.getByText(/NUMBER GUESSING GAME/)).toBeInTheDocument())
    await user.type(input, 'sl{Enter}')
    // the train must not run mid-game; sl is just a (bad) guess
    expect(screen.queryByText(/I_I_____===__/)).not.toBeInTheDocument()
  })

  it('the vim trap traps the other easter eggs too', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'vim{Enter}')
    await waitFor(() => expect(screen.getByText(/VIM - Vi IMproved/)).toBeInTheDocument())
    await user.type(input, 'sl{Enter}')
    await waitFor(() => expect(screen.getByText('E492: Not an editor command: sl')).toBeInTheDocument())
    expect(screen.queryByText(/I_I_____===__/)).not.toBeInTheDocument()
  })

  it('plain rm still works on files', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'touch zz-test{Enter}')
    await user.type(screen.getByRole('textbox'), 'rm zz-test{Enter}')
    // the file is really gone: cat reports No such file
    await user.type(screen.getByRole('textbox'), 'cat zz-test{Enter}')
    await waitFor(() => {
      expect(screen.getByText('cat: zz-test: No such file or directory')).toBeInTheDocument()
    })
  })
})
