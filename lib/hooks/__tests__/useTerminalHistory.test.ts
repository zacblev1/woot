import { renderHook, act } from '@testing-library/react'
import { useTerminalHistory } from '../useTerminalHistory'

describe('useTerminalHistory', () => {
  describe('initial state', () => {
    it('starts with empty history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      expect(result.current.history).toEqual([])
    })

    it('starts with historyIndex of -1', () => {
      const { result } = renderHook(() => useTerminalHistory())

      expect(result.current.historyIndex).toBe(-1)
    })
  })

  describe('add', () => {
    it('adds a command to history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
      })

      expect(result.current.history).toEqual(['ls'])
    })

    it('adds multiple commands in order', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('cd books')
        result.current.add('pwd')
      })

      expect(result.current.history).toEqual(['ls', 'cd books', 'pwd'])
    })

    it('resets historyIndex to -1 after adding', () => {
      const { result } = renderHook(() => useTerminalHistory())

      // First add some history and navigate
      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })
      act(() => {
        result.current.navigateUp()
      })
      expect(result.current.historyIndex).toBe(1)

      // Adding new command should reset index
      act(() => {
        result.current.add('cd')
      })

      expect(result.current.historyIndex).toBe(-1)
    })

    it('skips empty strings', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('')
      })

      expect(result.current.history).toEqual([])
    })

    it('skips whitespace-only strings', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('   ')
        result.current.add('\t')
        result.current.add('\n')
      })

      expect(result.current.history).toEqual([])
    })

    it('preserves whitespace within commands', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('echo hello world')
      })

      expect(result.current.history).toEqual(['echo hello world'])
    })
  })

  describe('clear', () => {
    it('clears all history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('cd')
        result.current.add('pwd')
      })
      expect(result.current.history).toHaveLength(3)

      act(() => {
        result.current.clear()
      })

      expect(result.current.history).toEqual([])
    })

    it('resets historyIndex to -1', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })
      act(() => {
        result.current.navigateUp()
      })
      expect(result.current.historyIndex).toBe(1)

      act(() => {
        result.current.clear()
      })

      expect(result.current.historyIndex).toBe(-1)
    })

    it('works when history is already empty', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.clear()
      })

      expect(result.current.history).toEqual([])
      expect(result.current.historyIndex).toBe(-1)
    })
  })

  describe('navigateUp', () => {
    it('returns null when history is empty', () => {
      const { result } = renderHook(() => useTerminalHistory())

      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })

      expect(command).toBeNull()
      expect(result.current.historyIndex).toBe(-1)
    })

    it('returns most recent command first time', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('cd')
        result.current.add('pwd')
      })

      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })

      expect(command).toBe('pwd')
      expect(result.current.historyIndex).toBe(2)
    })

    it('moves backward through history on repeated calls', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('first')
        result.current.add('second')
        result.current.add('third')
      })

      let command: string | null = null

      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('third')
      expect(result.current.historyIndex).toBe(2)

      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('second')
      expect(result.current.historyIndex).toBe(1)

      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('first')
      expect(result.current.historyIndex).toBe(0)
    })

    it('clamps at oldest command (index 0)', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('first')
        result.current.add('second')
      })

      let command: string | null = null

      // Navigate to oldest
      act(() => {
        result.current.navigateUp() // second
      })
      act(() => {
        result.current.navigateUp() // first
      })

      // Try to go past oldest
      act(() => {
        command = result.current.navigateUp()
      })

      expect(command).toBe('first')
      expect(result.current.historyIndex).toBe(0)
    })

    it('works with single item history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('only')
      })

      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })

      expect(command).toBe('only')
      expect(result.current.historyIndex).toBe(0)

      // Repeated up stays at 0
      act(() => {
        command = result.current.navigateUp()
      })

      expect(command).toBe('only')
      expect(result.current.historyIndex).toBe(0)
    })
  })

  describe('navigateDown', () => {
    it('returns null when not navigating (index -1)', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })

      let command: string | null = null
      act(() => {
        command = result.current.navigateDown()
      })

      expect(command).toBeNull()
      expect(result.current.historyIndex).toBe(-1)
    })

    it('moves forward through history after navigateUp', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('first')
        result.current.add('second')
        result.current.add('third')
      })

      // Navigate up to 'first'
      act(() => {
        result.current.navigateUp() // third
      })
      act(() => {
        result.current.navigateUp() // second
      })
      act(() => {
        result.current.navigateUp() // first
      })

      let command: string | null = null

      act(() => {
        command = result.current.navigateDown()
      })
      expect(command).toBe('second')
      expect(result.current.historyIndex).toBe(1)

      act(() => {
        command = result.current.navigateDown()
      })
      expect(command).toBe('third')
      expect(result.current.historyIndex).toBe(2)
    })

    it('returns null and resets index when moving past end', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('first')
        result.current.add('second')
      })

      // Navigate up then all the way down
      act(() => {
        result.current.navigateUp() // second, index=1
      })
      act(() => {
        result.current.navigateUp() // first, index=0
      })
      act(() => {
        result.current.navigateDown() // second, index=1
      })

      let command: string | null = null
      act(() => {
        command = result.current.navigateDown() // past end
      })

      expect(command).toBeNull()
      expect(result.current.historyIndex).toBe(-1)
    })

    it('works with single item history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('only')
      })

      act(() => {
        result.current.navigateUp() // only, index=0
      })

      let command: string | null = null
      act(() => {
        command = result.current.navigateDown() // past end
      })

      expect(command).toBeNull()
      expect(result.current.historyIndex).toBe(-1)
    })
  })

  describe('resetNavigation', () => {
    it('resets index to -1', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })
      act(() => {
        result.current.navigateUp()
      })
      expect(result.current.historyIndex).toBe(1)

      act(() => {
        result.current.resetNavigation()
      })

      expect(result.current.historyIndex).toBe(-1)
    })

    it('preserves history', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })
      act(() => {
        result.current.navigateUp()
      })
      act(() => {
        result.current.resetNavigation()
      })

      expect(result.current.history).toEqual(['ls', 'pwd'])
    })

    it('is idempotent when already at -1', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
      })

      act(() => {
        result.current.resetNavigation()
        result.current.resetNavigation()
      })

      expect(result.current.historyIndex).toBe(-1)
      expect(result.current.history).toEqual(['ls'])
    })
  })

  describe('integration', () => {
    it('handles typical usage: add commands, navigate, add more', () => {
      const { result } = renderHook(() => useTerminalHistory())

      // Add some commands
      act(() => {
        result.current.add('ls')
        result.current.add('cd books')
        result.current.add('cat dune')
      })

      expect(result.current.history).toEqual(['ls', 'cd books', 'cat dune'])
      expect(result.current.historyIndex).toBe(-1)

      // Navigate up twice
      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('cat dune')

      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('cd books')

      // Navigate down once
      act(() => {
        command = result.current.navigateDown()
      })
      expect(command).toBe('cat dune')

      // Add a new command (should reset navigation)
      act(() => {
        result.current.add('pwd')
      })

      expect(result.current.history).toEqual(['ls', 'cd books', 'cat dune', 'pwd'])
      expect(result.current.historyIndex).toBe(-1)
    })

    it('handles add resetting navigation mid-browse', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('first')
        result.current.add('second')
        result.current.add('third')
      })

      // Browse to middle
      act(() => {
        result.current.navigateUp() // third
      })
      act(() => {
        result.current.navigateUp() // second
      })
      expect(result.current.historyIndex).toBe(1)

      // Add new command while browsing
      act(() => {
        result.current.add('fourth')
      })

      expect(result.current.history).toEqual(['first', 'second', 'third', 'fourth'])
      expect(result.current.historyIndex).toBe(-1)

      // Navigate up should now start from 'fourth'
      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBe('fourth')
    })

    it('handles clear after navigation', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('ls')
        result.current.add('pwd')
      })
      act(() => {
        result.current.navigateUp()
      })
      expect(result.current.historyIndex).toBe(1)

      act(() => {
        result.current.clear()
      })

      expect(result.current.history).toEqual([])
      expect(result.current.historyIndex).toBe(-1)

      // Navigate up should return null on empty
      let command: string | null = null
      act(() => {
        command = result.current.navigateUp()
      })
      expect(command).toBeNull()
    })

    it('handles rapid up/down navigation', () => {
      const { result } = renderHook(() => useTerminalHistory())

      act(() => {
        result.current.add('a')
        result.current.add('b')
        result.current.add('c')
      })

      // Rapid navigation
      act(() => {
        result.current.navigateUp()   // c, index=2
      })
      act(() => {
        result.current.navigateDown() // past, index=-1
      })
      act(() => {
        result.current.navigateUp()   // c, index=2
      })
      act(() => {
        result.current.navigateUp()   // b, index=1
      })
      act(() => {
        result.current.navigateDown() // c, index=2
      })

      expect(result.current.historyIndex).toBe(2)
      expect(result.current.history[result.current.historyIndex]).toBe('c')
    })
  })
})
