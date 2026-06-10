import { describe, it, expect, beforeEach, vi } from 'vitest'
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

describe('ghost suggestions vs games', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('does not suggest shell commands during a text game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'cd books{Enter}')
    await user.type(input, 'cd ~{Enter}')
    await user.type(input, 'game number{Enter}')
    await waitFor(() => expect(screen.getByText(/NUMBER GUESSING GAME/)).toBeInTheDocument())
    await user.type(input, 'cd b')
    // no ghost remainder of 'cd books' may appear while the game is active
    expect(screen.queryByText('ooks')).not.toBeInTheDocument()
  })

  it('still suggests outside games', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'cd books{Enter}')
    await user.type(input, 'cd ~{Enter}')
    await user.type(input, 'cd b')
    expect(screen.getByText('ooks')).toBeInTheDocument()
  })
})
