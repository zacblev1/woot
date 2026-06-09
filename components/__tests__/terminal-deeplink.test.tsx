import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('Terminal ?cmd= deep links', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('executes a single command from the cmd query param on load', async () => {
    window.history.replaceState({}, '', '/?cmd=pwd')
    render(<WrappedTerminal />)
    await waitFor(() => {
      expect(screen.getByText('/home/zachary')).toBeInTheDocument()
    })
  })

  it('executes chained commands separated by &&', async () => {
    window.history.replaceState({}, '', `/?cmd=${encodeURIComponent('cd books && pwd')}`)
    render(<WrappedTerminal />)
    await waitFor(() => {
      expect(screen.getByText('/home/zachary/books')).toBeInTheDocument()
    })
  })

  it('does nothing without a cmd param', async () => {
    render(<WrappedTerminal />)
    // banner renders, but no pwd output appears
    expect(screen.getByText(/developer.*collector.*gamer/)).toBeInTheDocument()
    expect(screen.queryByText('/home/zachary')).not.toBeInTheDocument()
  })
})
