import { useRef, useEffect, forwardRef, useImperativeHandle, type KeyboardEvent } from 'react'
import { tokenizeInput, renderTokens } from './SyntaxHighlighter'
import { VALID_COMMANDS } from './types'

/**
 * Imperative handle for InputLine component.
 * Allows parent to programmatically control the input.
 */
export interface InputLineHandle {
  focus: () => void
  clear: () => void
  setValue: (value: string) => void
}

/**
 * Props for InputLine component.
 */
export interface InputLineProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onTabComplete: (partial: string) => void
  onHistoryUp: () => string | null
  onHistoryDown: () => string | null
  onClear: () => void
  onInterrupt: () => void
  prompt: string
  disabled?: boolean
  validCommands?: string[]
}

/**
 * InputLine handles all terminal input interactions.
 * NOT memoized because it needs to re-render on every keystroke.
 *
 * Uses forwardRef + useImperativeHandle to expose controlled API
 * (matching GameController pattern from Phase 3).
 *
 * Keyboard handling:
 * - Enter: Submit command
 * - Tab: Trigger completion
 * - ArrowUp/Down: Navigate history
 * - Ctrl+L: Clear terminal
 * - Ctrl+C / Cmd+C: Interrupt (for games)
 */
export const InputLine = forwardRef<InputLineHandle, InputLineProps>(
  function InputLine(props, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const {
      value,
      onChange,
      onSubmit,
      onTabComplete,
      onHistoryUp,
      onHistoryDown,
      onClear,
      onInterrupt,
      prompt,
      disabled = false,
      validCommands = [...VALID_COMMANDS],
    } = props

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => {
          onChange('')
          inputRef.current?.focus()
        },
        setValue: (val: string) => onChange(val),
      }),
      [onChange]
    )

    // Mobile keyboard support - scroll into view on focus
    useEffect(() => {
      const input = inputRef.current
      if (!input) return

      const handleFocus = () => {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 300)
      }

      input.addEventListener('focus', handleFocus)
      return () => input.removeEventListener('focus', handleFocus)
    }, [])

    // Keyboard event handler
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSubmit(value)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        onTabComplete(value)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cmd = onHistoryUp()
        if (cmd !== null) onChange(cmd)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cmd = onHistoryDown()
        onChange(cmd ?? '')
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault()
        onClear()
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        // Let parent decide if interrupt should happen
        // (only intercept if game is active, which parent controls)
        onInterrupt()
      }
    }

    // Tokenize input for syntax highlighting
    const tokens = tokenizeInput(value, validCommands)

    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-primary">{prompt}</span>
        <div className="flex-1 relative">
          {/* Highlighted overlay */}
          <div className="absolute inset-0 pointer-events-none whitespace-pre text-base md:text-sm">
            {renderTokens(tokens)}
          </div>
          {/* Actual input (transparent text) */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-transparent caret-foreground text-base md:text-sm relative z-10"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            disabled={disabled}
          />
        </div>
      </div>
    )
  }
)

InputLine.displayName = 'InputLine'
