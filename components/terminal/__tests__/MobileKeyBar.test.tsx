import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileKeyBar } from '../MobileKeyBar'

function mockPointer(coarse: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? coarse : false,
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

function makeHandlers() {
  return {
    onTab: vi.fn(),
    onHistoryUp: vi.fn(),
    onHistoryDown: vi.fn(),
    onInterrupt: vi.fn(),
    onEscape: vi.fn(),
    onCommandPalette: vi.fn(),
  }
}

const KEYS = ['Tab completion', 'History up', 'History down', 'Interrupt', 'Escape', 'Command palette']

describe('MobileKeyBar', () => {
  it('renders nothing on fine-pointer devices', () => {
    mockPointer(false)
    render(<MobileKeyBar {...makeHandlers()} />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('renders all six labelled keys on coarse-pointer devices', () => {
    mockPointer(true)
    render(<MobileKeyBar {...makeHandlers()} />)
    expect(screen.getByRole('toolbar', { name: 'Terminal keys' })).toBeInTheDocument()
    for (const name of KEYS) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('fires the matching handler for each key', () => {
    mockPointer(true)
    const handlers = makeHandlers()
    render(<MobileKeyBar {...handlers} />)
    const expectations: Array<[string, ReturnType<typeof vi.fn>]> = [
      ['Tab completion', handlers.onTab],
      ['History up', handlers.onHistoryUp],
      ['History down', handlers.onHistoryDown],
      ['Interrupt', handlers.onInterrupt],
      ['Escape', handlers.onEscape],
      ['Command palette', handlers.onCommandPalette],
    ]
    for (const [name, handler] of expectations) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(handler).toHaveBeenCalledTimes(1)
    }
  })
})
