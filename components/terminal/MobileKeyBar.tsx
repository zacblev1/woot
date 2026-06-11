import { useSyncExternalStore } from 'react'

const COARSE_QUERY = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COARSE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(COARSE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export interface MobileKeyBarProps {
  onTab: () => void
  onHistoryUp: () => void
  onHistoryDown: () => void
  onInterrupt: () => void
  onEscape: () => void
  onCommandPalette: () => void
}

/**
 * Touch-device shortcut bar rendered between history and the input line.
 * Buttons reuse the Terminal's existing key handlers (no synthetic
 * KeyboardEvents); pointerdown is prevented so taps never steal focus
 * from the terminal input (which would close the mobile keyboard).
 */
export function MobileKeyBar(props: MobileKeyBarProps) {
  const coarse = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!coarse) return null

  const keys: Array<{ label: string; aria: string; onPress: () => void }> = [
    { label: 'Tab', aria: 'Tab completion', onPress: props.onTab },
    { label: '↑', aria: 'History up', onPress: props.onHistoryUp },
    { label: '↓', aria: 'History down', onPress: props.onHistoryDown },
    { label: 'Ctrl+C', aria: 'Interrupt', onPress: props.onInterrupt },
    { label: 'Esc', aria: 'Escape', onPress: props.onEscape },
    { label: '⌘K', aria: 'Command palette', onPress: props.onCommandPalette },
  ]

  return (
    <div role="toolbar" aria-label="Terminal keys" className="flex gap-2 py-2 shrink-0 overflow-x-auto">
      {keys.map(({ label, aria, onPress }) => (
        <button
          key={label}
          type="button"
          aria-label={aria}
          className="px-3 py-1 rounded border border-border text-muted-foreground text-xs whitespace-nowrap active:text-primary active:border-primary"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onPress}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
