// components/__tests__/terminal-chrome.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalChrome } from '@/components/terminal-chrome'
import { TerminalContextProvider } from '@/lib/terminal-context'

describe('TerminalChrome', () => {
  it('renders title bar with hostname', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText(/zachary@home/)).toBeInTheDocument()
  })

  it('renders status bar with Ctrl+K hint', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText(/Ctrl\+K/)).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>test child</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText('test child')).toBeInTheDocument()
  })

  it('renders three traffic light dots', () => {
    const { container } = render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    const dots = container.querySelectorAll('[data-dot]')
    expect(dots).toHaveLength(3)
  })
})
