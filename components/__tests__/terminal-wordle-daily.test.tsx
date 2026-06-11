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

describe('daily wordle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    mockMatchMedia({})
    window.history.replaceState({}, '', '/')
  })

  async function winToday(user: ReturnType<typeof userEvent.setup>) {
    const { dailyWord, localDateString } = await import('@/components/games/wordle-game/daily')
    const word = dailyWord(localDateString())
    const input = screen.getByRole('textbox')
    await user.type(input, 'game wordle{Enter}')
    await user.type(input, `${word}{Enter}`)
    return word
  }

  it('game wordle plays the daily word and reports streak + emoji grid on a win', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => {
      expect(screen.getByText(/You got it in 1\/6/)).toBeInTheDocument()
      expect(screen.getByText('🟩🟩🟩🟩🟩')).toBeInTheDocument()
      expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument()
    })
  })

  it('replaying the same day shows the result instead of a fresh game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'game wordle{Enter}')
    await waitFor(() => {
      expect(screen.getByText(/Already solved today's wordle/)).toBeInTheDocument()
      // no fresh game started: the intro was only ever printed once
      expect(screen.queryAllByText(/Guess the 5-letter word/).length).toBe(1)
    })
  })

  it('game wordle practice starts a random round and ignores the daily record', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'game wordle practice{Enter}')
    await waitFor(() => {
      expect(screen.getAllByText(/Guess the 5-letter word/).length).toBe(2)
    })
    // exit cleanly
    await user.type(screen.getByRole('textbox'), 'quit{Enter}')
  })

  it('rejects an unknown wordle mode', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'game wordle hardcore{Enter}')
    await waitFor(() => {
      expect(screen.getByText("game: unknown wordle mode 'hardcore' (try: game wordle practice)")).toBeInTheDocument()
    })
  })
})
