import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputLine, type InputLineHandle, type InputLineProps } from '../InputLine'

// Default props for tests
const createDefaultProps = (overrides: Partial<InputLineProps> = {}): InputLineProps => ({
  value: '',
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onTabComplete: vi.fn(),
  onHistoryUp: vi.fn().mockReturnValue(null),
  onHistoryDown: vi.fn().mockReturnValue(null),
  onClear: vi.fn(),
  onInterrupt: vi.fn(),
  prompt: '~ $',
  ...overrides,
})

describe('InputLine', () => {
  describe('basic rendering', () => {
    it('renders prompt text', () => {
      render(<InputLine {...createDefaultProps({ prompt: '~/books $' })} />)
      expect(screen.getByText('~/books $')).toBeInTheDocument()
    })

    it('renders input element', () => {
      render(<InputLine {...createDefaultProps()} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('input has correct value', () => {
      render(<InputLine {...createDefaultProps({ value: 'ls -la' })} />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('ls -la')
    })

    it('disabled prop disables input', () => {
      render(<InputLine {...createDefaultProps({ disabled: true })} />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('input is focused by default (autoFocus)', () => {
      render(<InputLine {...createDefaultProps()} />)
      const input = screen.getByRole('textbox')
      expect(document.activeElement).toBe(input)
    })

    it('disables spellcheck and autocomplete', () => {
      render(<InputLine {...createDefaultProps()} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('spellcheck', 'false')
      expect(input).toHaveAttribute('autocomplete', 'off')
      expect(input).toHaveAttribute('autocorrect', 'off')
      expect(input).toHaveAttribute('autocapitalize', 'off')
    })
  })

  describe('keyboard events - Enter', () => {
    it('calls onSubmit with current value on Enter', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<InputLine {...createDefaultProps({ value: 'ls', onSubmit })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Enter}')

      expect(onSubmit).toHaveBeenCalledWith('ls')
    })

    it('calls onSubmit with empty string when value is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<InputLine {...createDefaultProps({ value: '', onSubmit })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Enter}')

      expect(onSubmit).toHaveBeenCalledWith('')
    })
  })

  describe('keyboard events - Tab', () => {
    it('calls onTabComplete with current value on Tab', async () => {
      const user = userEvent.setup()
      const onTabComplete = vi.fn()
      render(<InputLine {...createDefaultProps({ value: 'th', onTabComplete })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Tab}')

      expect(onTabComplete).toHaveBeenCalledWith('th')
    })

    it('prevents default on Tab (no focus change)', async () => {
      const user = userEvent.setup()
      const onTabComplete = vi.fn()
      render(
        <div>
          <InputLine {...createDefaultProps({ value: 'test', onTabComplete })} />
          <button>Other element</button>
        </div>
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '{Tab}')

      // If preventDefault works, focus should still be on input
      expect(document.activeElement).toBe(input)
    })
  })

  describe('keyboard events - ArrowUp', () => {
    it('calls onHistoryUp on ArrowUp', async () => {
      const user = userEvent.setup()
      const onHistoryUp = vi.fn().mockReturnValue(null)
      render(<InputLine {...createDefaultProps({ onHistoryUp })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowUp}')

      expect(onHistoryUp).toHaveBeenCalled()
    })

    it('calls onChange with returned value when onHistoryUp returns a command', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onHistoryUp = vi.fn().mockReturnValue('previous-command')
      render(<InputLine {...createDefaultProps({ onChange, onHistoryUp })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowUp}')

      expect(onChange).toHaveBeenCalledWith('previous-command')
    })

    it('does not call onChange when onHistoryUp returns null', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onHistoryUp = vi.fn().mockReturnValue(null)
      render(<InputLine {...createDefaultProps({ onChange, onHistoryUp })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowUp}')

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('keyboard events - ArrowDown', () => {
    it('calls onHistoryDown on ArrowDown', async () => {
      const user = userEvent.setup()
      const onHistoryDown = vi.fn().mockReturnValue(null)
      render(<InputLine {...createDefaultProps({ onHistoryDown })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowDown}')

      expect(onHistoryDown).toHaveBeenCalled()
    })

    it('calls onChange with returned value when onHistoryDown returns a command', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onHistoryDown = vi.fn().mockReturnValue('next-command')
      render(<InputLine {...createDefaultProps({ onChange, onHistoryDown })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowDown}')

      expect(onChange).toHaveBeenCalledWith('next-command')
    })

    it('calls onChange with empty string when onHistoryDown returns null', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onHistoryDown = vi.fn().mockReturnValue(null)
      render(<InputLine {...createDefaultProps({ onChange, onHistoryDown })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{ArrowDown}')

      expect(onChange).toHaveBeenCalledWith('')
    })
  })

  describe('keyboard events - Ctrl+L', () => {
    it('calls onClear on Ctrl+L', async () => {
      const user = userEvent.setup()
      const onClear = vi.fn()
      render(<InputLine {...createDefaultProps({ onClear })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Control>}l{/Control}')

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('keyboard events - Ctrl+C / Cmd+C', () => {
    it('calls onInterrupt on Ctrl+C', async () => {
      const user = userEvent.setup()
      const onInterrupt = vi.fn()
      render(<InputLine {...createDefaultProps({ onInterrupt })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Control>}c{/Control}')

      expect(onInterrupt).toHaveBeenCalled()
    })

    it('calls onInterrupt on Meta+C (Mac)', async () => {
      const user = userEvent.setup()
      const onInterrupt = vi.fn()
      render(<InputLine {...createDefaultProps({ onInterrupt })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '{Meta>}c{/Meta}')

      expect(onInterrupt).toHaveBeenCalled()
    })
  })

  describe('imperative handle', () => {
    it('exposes focus method via ref', () => {
      const ref = React.createRef<InputLineHandle>()
      render(<InputLine ref={ref} {...createDefaultProps()} />)

      const input = screen.getByRole('textbox')
      // Blur the input first
      input.blur()
      expect(document.activeElement).not.toBe(input)

      // Focus via ref
      ref.current?.focus()
      expect(document.activeElement).toBe(input)
    })

    it('exposes clear method via ref', () => {
      const ref = React.createRef<InputLineHandle>()
      const onChange = vi.fn()
      render(<InputLine ref={ref} {...createDefaultProps({ value: 'test', onChange })} />)

      ref.current?.clear()

      expect(onChange).toHaveBeenCalledWith('')
    })

    it('clear method also focuses the input', () => {
      const ref = React.createRef<InputLineHandle>()
      const onChange = vi.fn()
      render(<InputLine ref={ref} {...createDefaultProps({ onChange })} />)

      const input = screen.getByRole('textbox')
      input.blur()
      expect(document.activeElement).not.toBe(input)

      ref.current?.clear()

      expect(document.activeElement).toBe(input)
    })

    it('exposes setValue method via ref', () => {
      const ref = React.createRef<InputLineHandle>()
      const onChange = vi.fn()
      render(<InputLine ref={ref} {...createDefaultProps({ onChange })} />)

      ref.current?.setValue('new value')

      expect(onChange).toHaveBeenCalledWith('new value')
    })
  })

  describe('syntax highlighting', () => {
    it('valid command shows accent color', () => {
      render(<InputLine {...createDefaultProps({ value: 'ls' })} />)
      const highlighted = screen.getByText('ls')
      expect(highlighted).toHaveClass('text-accent', 'font-semibold')
    })

    it('invalid command shows destructive color', () => {
      render(<InputLine {...createDefaultProps({ value: 'invalid' })} />)
      const highlighted = screen.getByText('invalid')
      expect(highlighted).toHaveClass('text-destructive')
    })

    it('path argument shows primary color', () => {
      render(<InputLine {...createDefaultProps({ value: 'cd ~/books' })} />)
      const path = screen.getByText('~/books')
      expect(path).toHaveClass('text-primary')
    })

    it('uses custom validCommands prop', () => {
      render(
        <InputLine
          {...createDefaultProps({ value: 'custom', validCommands: ['custom'] })}
        />
      )
      const command = screen.getByText('custom')
      expect(command).toHaveClass('text-accent', 'font-semibold')
    })
  })

  describe('onChange handler', () => {
    it('calls onChange when input value changes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<InputLine {...createDefaultProps({ onChange })} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'a')

      expect(onChange).toHaveBeenCalledWith('a')
    })
  })

  describe('mobile focus scroll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('adds focus listener for scroll into view', () => {
      const scrollIntoView = vi.fn()
      render(<InputLine {...createDefaultProps()} />)

      const input = screen.getByRole('textbox')
      input.scrollIntoView = scrollIntoView

      // Trigger focus event
      input.dispatchEvent(new Event('focus'))

      // Advance timers past the 300ms delay
      vi.advanceTimersByTime(300)

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' })
    })

    afterEach(() => {
      vi.useRealTimers()
    })
  })
})
