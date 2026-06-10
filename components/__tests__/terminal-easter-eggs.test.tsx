import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
