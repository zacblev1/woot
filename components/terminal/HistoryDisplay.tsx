import { memo, useRef, useEffect } from 'react'
import type { TerminalLine as TerminalLineType } from '@/lib/types/terminal'
import { TerminalLine } from './TerminalLine'

export interface HistoryDisplayProps {
  history: TerminalLineType[]
  className?: string
}

/**
 * HistoryDisplay renders terminal output history with auto-scroll.
 * Memoized to avoid re-renders when only input state changes.
 */
function HistoryDisplayComponent({ history, className = '' }: HistoryDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto${className ? ` ${className}` : ''}`}
    >
      {history.map((line, i) => (
        <TerminalLine key={i} line={line} />
      ))}
    </div>
  )
}

export const HistoryDisplay = memo(HistoryDisplayComponent)

HistoryDisplay.displayName = 'HistoryDisplay'
