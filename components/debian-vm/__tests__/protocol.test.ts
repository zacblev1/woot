import { describe, it, expect } from 'vitest'
import { winsizeMessage, EXIT_OSC, ESCAPE_KEY, isEscape, formatMegabytes } from '../protocol'

describe('winsizeMessage', () => {
  it('encodes "rows cols" plus newline for the guest woot-winsize helper', () => {
    expect(winsizeMessage(24, 80)).toBe('24 80\n')
  })

  it('floors fractional sizes and clamps to the guest-accepted range', () => {
    expect(winsizeMessage(30.7, 120.2)).toBe('30 120\n')
    expect(winsizeMessage(0, 0)).toBe('1 1\n')
    expect(winsizeMessage(9999, 9999)).toBe('500 1000\n')
  })

  it('returns null for non-finite sizes (terminal not laid out yet)', () => {
    expect(winsizeMessage(NaN, 80)).toBeNull()
    expect(winsizeMessage(24, Infinity)).toBeNull()
  })
})

describe('exit signalling', () => {
  it('uses the private OSC number the guest .bash_logout emits', () => {
    expect(EXIT_OSC).toBe(7337)
  })

  it('treats Ctrl+] (telnet escape) as leave-the-VM', () => {
    expect(ESCAPE_KEY).toBe('\x1d')
    expect(isEscape('\x1d')).toBe(true)
    expect(isEscape('ls\x1d')).toBe(true)
    expect(isEscape('\x03')).toBe(false)
    expect(isEscape('ls -la\r')).toBe(false)
  })
})

describe('formatMegabytes', () => {
  it('renders download sizes for the progress line', () => {
    expect(formatMegabytes(23_012_345)).toBe('23.0 MB')
    expect(formatMegabytes(512_000)).toBe('0.5 MB')
  })
})
