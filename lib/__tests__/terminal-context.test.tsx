import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalContextProvider, useTerminalContext } from '@/lib/terminal-context'

function TestConsumer() {
  const ctx = useTerminalContext()
  return (
    <div>
      <span data-testid="dir">{ctx.currentDirectory}</span>
      <span data-testid="theme">{ctx.currentTheme}</span>
      <span data-testid="font">{ctx.currentFont}</span>
      <span data-testid="sound">{ctx.soundEnabled ? 'on' : 'off'}</span>
    </div>
  )
}

describe('TerminalContext', () => {
  it('provides default values', () => {
    render(
      <TerminalContextProvider>
        <TestConsumer />
      </TerminalContextProvider>
    )
    expect(screen.getByTestId('dir').textContent).toBe('~')
    expect(screen.getByTestId('theme').textContent).toBe('midnight')
    expect(screen.getByTestId('font').textContent).toBe('jetbrains')
    expect(screen.getByTestId('sound').textContent).toBe('off')
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})
