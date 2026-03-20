import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '@/components/command-palette'

describe('CommandPalette', () => {
  it('renders search input', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('shows all commands when input is empty', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    expect(screen.getByText('help')).toBeInTheDocument()
    expect(screen.getByText('ls')).toBeInTheDocument()
  })

  it('filters results on input', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'hel' } })
    expect(screen.getByText('help')).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(<CommandPalette onClose={onClose} onExecute={vi.fn()} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onExecute with first command on Enter with empty query', () => {
    const onExecute = vi.fn()
    render(<CommandPalette onClose={vi.fn()} onExecute={onExecute} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Enter' })
    // First command in VALID_COMMANDS is 'ls'
    expect(onExecute).toHaveBeenCalledWith('ls')
  })
})
