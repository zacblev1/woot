import { memo, type ReactNode } from 'react'
import type { TerminalLine as TerminalLineType, TerminalLineType as LineType } from '@/lib/types/terminal'
import { highlightInput, highlightLine } from './SyntaxHighlighter'
import type { TerminalLineProps } from './types'

/**
 * Get CSS class for line type.
 */
function getColorClass(type: LineType): string {
  switch (type) {
    case 'input':
      return 'text-primary crt-glow'
    case 'error':
      return 'text-destructive'
    case 'success':
      return 'text-accent crt-glow'
    case 'banner':
      return 'text-accent crt-glow'
    case 'link':
      return 'text-foreground'
    case 'wordle':
      return '' // Special rendering, no color class
    default:
      return 'text-foreground'
  }
}

/**
 * Render wordle line content with colored letters.
 * Format: "X:A,?:B, :C" where X=green, ?=yellow, space=gray
 */
function renderWordleContent(content: string): ReactNode {
  return (
    <span className="font-mono tracking-widest">
      {content.split(',').map((pair, idx) => {
        const [mark, letter] = pair.split(':')
        const colorClass =
          mark === 'X'
            ? 'text-green-400'
            : mark === '?'
              ? 'text-yellow-400'
              : 'text-muted-foreground'
        return (
          <span key={idx} className={`${colorClass} font-bold`}>
            {letter}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Render line content based on type.
 */
function renderLineContent(line: TerminalLineType): ReactNode {
  switch (line.type) {
    case 'input':
      return highlightInput(line.content)

    case 'link':
      if (line.href) {
        return (
          <a
            href={line.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {line.content}
          </a>
        )
      }
      return line.content

    case 'wordle':
      return renderWordleContent(line.content)

    case 'image':
      if (line.src) {
        return (
          <img
            src={line.src}
            alt={line.content}
            className="max-w-[80px] border border-border"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
          />
        )
      }
      return null

    default:
      return highlightLine(line.content)
  }
}

/**
 * TerminalLine renders a single terminal line with appropriate styling.
 * Memoized because the same line content rarely changes.
 */
export const TerminalLine = memo(function TerminalLine({ line }: TerminalLineProps) {
  const baseClass = 'whitespace-pre-wrap break-words break-all'
  const colorClass = getColorClass(line.type)
  const centeredClass = line.centered ? ' text-center' : ''

  return (
    <div className={`${baseClass}${colorClass ? ` ${colorClass}` : ''}${centeredClass}`}>
      {line.centered ? (
        <span className="inline-block text-left">{renderLineContent(line)}</span>
      ) : (
        renderLineContent(line)
      )}
    </div>
  )
})
