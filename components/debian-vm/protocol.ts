/**
 * Host <-> guest conventions shared with the image (tools/debian-vm/).
 */

/** Private OSC the guest's ~/.bash_logout prints: ESC ] 7337 ; exit BEL. */
export const EXIT_OSC = 7337

/** Ctrl+] — the telnet escape — always leaves the VM. */
export const ESCAPE_KEY = '\x1d'

export function isEscape(data: string): boolean {
  return data.includes(ESCAPE_KEY)
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Terminal-size update for the guest's woot-winsize helper on ttyS1
 * ("ROWS COLS\n", ranges mirrored from its validation).
 */
export function winsizeMessage(rows: number, cols: number): string | null {
  if (!Number.isFinite(rows) || !Number.isFinite(cols)) return null
  return `${clamp(Math.floor(rows), 1, 500)} ${clamp(Math.floor(cols), 1, 1000)}\n`
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
