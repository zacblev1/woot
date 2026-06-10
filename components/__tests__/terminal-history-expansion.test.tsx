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

describe('history expansion', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('!! repeats the previous command and echoes the expansion', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'pwd{Enter}')
    await user.type(input, '!!{Enter}')
    await waitFor(() => {
      expect(screen.getAllByText('/home/zachary').length).toBe(2)
      // The prompt and command render in separate spans (syntax highlighting),
      // so assert on the command span: both the original `pwd` line and the
      // expanded `!!` echo render a `pwd` command span.
      expect(screen.getAllByText('pwd').length).toBe(2)
    })
  })

  it('!n runs the nth command from history', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'whoami{Enter}')
    await user.type(input, 'pwd{Enter}')
    await user.type(input, '!1{Enter}')
    await waitFor(() => {
      expect(screen.getAllByText('zachary').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('reports unknown events', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, '!99{Enter}')
    await waitFor(() => {
      expect(screen.getByText('!99: event not found')).toBeInTheDocument()
    })
  })
})
