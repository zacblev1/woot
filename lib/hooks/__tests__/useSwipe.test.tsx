import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSwipe, swipeDirection, type SwipeDirection } from '../useSwipe'

describe('swipeDirection', () => {
  it('maps the dominant axis to a direction', () => {
    expect(swipeDirection(100, 10)).toBe('RIGHT')
    expect(swipeDirection(-100, 10)).toBe('LEFT')
    expect(swipeDirection(10, 100)).toBe('DOWN')
    expect(swipeDirection(10, -100)).toBe('UP')
  })
  it('returns null below the minimum distance', () => {
    expect(swipeDirection(10, 5)).toBeNull()
    expect(swipeDirection(0, 0)).toBeNull()
    expect(swipeDirection(23, 0, 24)).toBeNull()
    expect(swipeDirection(24, 0, 24)).toBe('RIGHT')
  })
  it('horizontal wins exact diagonals', () => {
    expect(swipeDirection(50, 50)).toBe('RIGHT')
    expect(swipeDirection(-50, -50)).toBe('LEFT')
  })
})

function Harness({ onSwipe }: { onSwipe: (dir: SwipeDirection) => void }) {
  const handlers = useSwipe(onSwipe)
  return <div data-testid="pad" {...handlers} />
}

describe('useSwipe', () => {
  it('reports a swipe from pointer down/up coordinates', () => {
    const onSwipe = vi.fn()
    render(<Harness onSwipe={onSwipe} />)
    const pad = screen.getByTestId('pad')
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(pad, { clientX: 120, clientY: 18 })
    expect(onSwipe).toHaveBeenCalledWith('RIGHT')
  })

  it('ignores taps (movement under the threshold)', () => {
    const onSwipe = vi.fn()
    render(<Harness onSwipe={onSwipe} />)
    const pad = screen.getByTestId('pad')
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(pad, { clientX: 14, clientY: 12 })
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('ignores a pointer up without a matching down', () => {
    const onSwipe = vi.fn()
    render(<Harness onSwipe={onSwipe} />)
    fireEvent.pointerUp(screen.getByTestId('pad'), { clientX: 200, clientY: 10 })
    expect(onSwipe).not.toHaveBeenCalled()
  })
})
