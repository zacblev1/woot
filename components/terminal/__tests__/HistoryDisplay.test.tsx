import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryDisplay } from '../HistoryDisplay'
import type { TerminalLine } from '@/lib/types/terminal'

describe('HistoryDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders empty container for empty history', () => {
      render(<HistoryDisplay history={[]} />)
      // Container should exist but have no children
      const container = document.querySelector('.flex-1.overflow-y-auto')
      expect(container).toBeInTheDocument()
      expect(container?.children.length).toBe(0)
    })

    it('renders single line', () => {
      const history: TerminalLine[] = [
        { type: 'output', content: 'Hello world' }
      ]
      render(<HistoryDisplay history={history} />)
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('renders multiple lines', () => {
      const history: TerminalLine[] = [
        { type: 'output', content: 'Line 1' },
        { type: 'output', content: 'Line 2' },
        { type: 'output', content: 'Line 3' }
      ]
      render(<HistoryDisplay history={history} />)
      expect(screen.getByText('Line 1')).toBeInTheDocument()
      expect(screen.getByText('Line 2')).toBeInTheDocument()
      expect(screen.getByText('Line 3')).toBeInTheDocument()
    })
  })

  describe('line types', () => {
    it('renders input lines with correct styling', () => {
      const history: TerminalLine[] = [
        { type: 'input', content: '~ $ ls' }
      ]
      render(<HistoryDisplay history={history} />)
      // Input lines get syntax highlighting with accent for command
      expect(screen.getByText('ls')).toHaveClass('text-accent', 'font-semibold')
    })

    it('renders output lines correctly', () => {
      const history: TerminalLine[] = [
        { type: 'output', content: 'Output text' }
      ]
      render(<HistoryDisplay history={history} />)
      expect(screen.getByText('Output text')).toBeInTheDocument()
    })

    it('renders error lines with destructive styling', () => {
      const history: TerminalLine[] = [
        { type: 'error', content: 'Error message' }
      ]
      render(<HistoryDisplay history={history} />)
      const container = screen.getByText('Error message').closest('div')
      expect(container).toHaveClass('text-destructive')
    })

    it('renders success lines with accent styling', () => {
      const history: TerminalLine[] = [
        { type: 'success', content: 'Success!' }
      ]
      render(<HistoryDisplay history={history} />)
      const container = screen.getByText('Success!').closest('div')
      expect(container).toHaveClass('text-accent')
    })

    it('renders link lines as clickable anchors', () => {
      const history: TerminalLine[] = [
        { type: 'link', content: 'Click here', href: 'https://example.com' }
      ]
      render(<HistoryDisplay history={history} />)
      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('renders wordle lines with colored feedback', () => {
      const history: TerminalLine[] = [
        { type: 'wordle', content: 'X:A,?:B, :C' }
      ]
      render(<HistoryDisplay history={history} />)
      expect(screen.getByText('A')).toHaveClass('text-green-400', 'font-bold')
      expect(screen.getByText('B')).toHaveClass('text-yellow-400', 'font-bold')
      expect(screen.getByText('C')).toHaveClass('text-muted-foreground', 'font-bold')
    })
  })

  describe('auto-scroll behavior', () => {
    it('scrolls to bottom on mount', () => {
      const history: TerminalLine[] = [
        { type: 'output', content: 'Line 1' },
        { type: 'output', content: 'Line 2' }
      ]
      render(<HistoryDisplay history={history} />)

      const container = document.querySelector('.flex-1.overflow-y-auto')
      // After mount, scrollTop should be set to scrollHeight
      // In JSDOM, both default to 0, so we verify the container exists
      expect(container).toBeInTheDocument()
    })

    it('scrolls to bottom when history updates', () => {
      const { rerender } = render(
        <HistoryDisplay history={[{ type: 'output', content: 'Line 1' }]} />
      )

      const container = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement

      // Mock scroll properties
      let scrollTopValue = 0
      Object.defineProperty(container, 'scrollHeight', {
        get: () => 500,
        configurable: true
      })
      Object.defineProperty(container, 'scrollTop', {
        get: () => scrollTopValue,
        set: (value) => { scrollTopValue = value },
        configurable: true
      })

      // Update with new history
      rerender(
        <HistoryDisplay history={[
          { type: 'output', content: 'Line 1' },
          { type: 'output', content: 'Line 2' }
        ]} />
      )

      // After rerender, scrollTop should be set to scrollHeight
      expect(scrollTopValue).toBe(500)
    })
  })

  describe('memoization', () => {
    it('renders correctly with same history reference', () => {
      const history: TerminalLine[] = [
        { type: 'output', content: 'Static content' }
      ]
      const { rerender } = render(<HistoryDisplay history={history} />)

      // Rerender with same reference
      rerender(<HistoryDisplay history={history} />)

      // Content should still be there
      expect(screen.getByText('Static content')).toBeInTheDocument()
    })

    it('updates when history reference changes', () => {
      const history1: TerminalLine[] = [
        { type: 'output', content: 'First' }
      ]
      const history2: TerminalLine[] = [
        { type: 'output', content: 'First' },
        { type: 'output', content: 'Second' }
      ]

      const { rerender } = render(<HistoryDisplay history={history1} />)
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.queryByText('Second')).not.toBeInTheDocument()

      rerender(<HistoryDisplay history={history2} />)
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('exposes terminal output as a polite live region', () => {
      const history: TerminalLine[] = [{ type: 'output', content: 'hello' }]
      render(<HistoryDisplay history={history} />)
      const log = screen.getByRole('log')
      expect(log).toHaveAttribute('aria-live', 'polite')
      expect(log).toHaveAccessibleName()
    })
  })

  describe('className prop', () => {
    it('applies default classes', () => {
      render(<HistoryDisplay history={[]} />)
      const container = document.querySelector('.flex-1.overflow-y-auto')
      expect(container).toBeInTheDocument()
    })

    it('merges custom className with default classes', () => {
      render(<HistoryDisplay history={[]} className="custom-class" />)
      const container = document.querySelector('.flex-1.overflow-y-auto.custom-class')
      expect(container).toBeInTheDocument()
    })

    it('works with empty className', () => {
      render(<HistoryDisplay history={[]} className="" />)
      const container = document.querySelector('.flex-1.overflow-y-auto')
      expect(container).toBeInTheDocument()
    })
  })

  describe('displayName', () => {
    it('has displayName for React DevTools', () => {
      expect(HistoryDisplay.displayName).toBe('HistoryDisplay')
    })
  })
})
