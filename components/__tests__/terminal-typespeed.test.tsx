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

describe('typespeed', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    mockMatchMedia({})
    window.history.replaceState({}, '', '/')
  })

  async function playThreeRounds(user: ReturnType<typeof userEvent.setup>) {
    const input = screen.getByRole('textbox')
    await user.type(input, 'game typespeed{Enter}')
    await waitFor(() => expect(screen.getByText(/TYPESPEED/)).toBeInTheDocument())
    for (let round = 0; round < 3; round++) {
      // typing anything ends the round; accuracy just suffers
      await user.type(input, 'x{Enter}')
    }
  }

  it('plays three rounds and offers initials entry', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => {
      expect(screen.getByText(/FINAL SCORE/)).toBeInTheDocument()
      expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument()
    })
  })

  it('skip declines the leaderboard and ends the game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'skip{Enter}')
    await waitFor(() => expect(screen.getByText(/Maybe next time/)).toBeInTheDocument())
    // game is over: commands work again
    await user.type(screen.getByRole('textbox'), 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
  })

  it('posts initials to the scores API', async () => {
    const posted: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') posted.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify({ scores: [], score: { id: 1 } }), { status: 201 })
    }))
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'zab{Enter}')
    await waitFor(() => expect(screen.getByText(/Score posted/)).toBeInTheDocument())
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({ gameType: 'typespeed', initials: 'ZAB', level: 1 })
    vi.unstubAllGlobals()
  })

  it("a lone 'q' at the initials prompt quits instead of posting initials", async () => {
    const posted: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') posted.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify({ scores: [] }), { status: 200 })
    }))
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'q{Enter}')
    await waitFor(() => expect(screen.getByText(/Maybe next time/)).toBeInTheDocument())
    expect(posted).toHaveLength(0)
    vi.unstubAllGlobals()
  })

  it('quit exits mid-game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'game typespeed{Enter}')
    await waitFor(() => expect(screen.getByText(/TYPESPEED/)).toBeInTheDocument())
    await user.type(input, 'quit{Enter}')
    await waitFor(() => expect(screen.getByText(/Typespeed ended/)).toBeInTheDocument())
  })
})
