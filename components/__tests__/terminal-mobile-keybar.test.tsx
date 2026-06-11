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

describe('Terminal mobile key bar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('is hidden on fine-pointer devices', () => {
    mockMatchMedia({})
    render(<WrappedTerminal />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('history-up button recalls the previous command into the input', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'History up' }))
    expect(input).toHaveValue('pwd')
  })

  it('escape button clears the input', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'partial command')
    fireEvent.click(screen.getByRole('button', { name: 'Escape' }))
    expect(input).toHaveValue('')
  })

  it('history/tab buttons also abort a running tour instead of editing the typewriter', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/GUIDED TOUR/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'History up' }))
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
    // taking over does not also recall a history entry into the input
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('escape button aborts a running tour (touch devices have no keydowns)', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/GUIDED TOUR/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Escape' }))
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
  })

  it('tab button completes an unambiguous command', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'neof')
    fireEvent.click(screen.getByRole('button', { name: 'Tab completion' }))
    expect(input).toHaveValue('neofetch')
  })
})
