import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

function mockMatchMedia(matching: Record<string, boolean>) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matching[query] ?? false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('tour', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('advertises the tour in the banner', () => {
    mockMatchMedia({})
    render(<WrappedTerminal />)
    expect(screen.getByText("Type 'tour' for a guided demo.")).toBeInTheDocument()
  })

  it('runs the scripted demo end-to-end under reduced motion', async () => {
    mockMatchMedia({ '(prefers-reduced-motion: reduce)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/GUIDED TOUR/)).toBeInTheDocument())
    await waitFor(
      () => {
        expect(screen.getByText('COMMANDS')).toBeInTheDocument() // help ran
        // view pulp ran (getAllByText: ls also lists authors, incl. Bukowski)
        expect(screen.getAllByText(/Bukowski/).length).toBeGreaterThan(0)
        expect(screen.getByText(/Synchronicity - The Police/)).toBeInTheDocument() // search ran
        expect(screen.getByText('BOOK GENRES')).toBeInTheDocument() // stats ran
        expect(screen.getByText('The terminal is yours.')).toBeInTheDocument() // closing narration
      },
      { timeout: 5000 }
    )
  })

  it('any keypress aborts the tour', async () => {
    mockMatchMedia({}) // full motion: typewriter pacing leaves time to abort
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/GUIDED TOUR/)).toBeInTheDocument())
    fireEvent.keyDown(window, { key: 'x' })
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
    expect(screen.queryByText('BOOK GENRES')).not.toBeInTheDocument()
  })

  it('a submitted command during the tour aborts instead of executing garbage', async () => {
    mockMatchMedia({})
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/GUIDED TOUR/)).toBeInTheDocument())
    fireEvent.keyDown(input, { key: 'Enter' }) // submit whatever is half-typed
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
    expect(screen.queryByText(/command not found/)).not.toBeInTheDocument()
  })
})
