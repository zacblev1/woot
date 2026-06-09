import { describe, it, expect, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Screensaver } from '@/components/screensaver'

afterEach(() => {
  vi.restoreAllMocks()
})

// happy-dom has no canvas 2D implementation; provide the minimal surface the
// screensaver draws with so the animation code path actually runs.
function mockCanvasContext() {
  const fakeCtx = {
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    fillRect: vi.fn(),
    fillText: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D
  )
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList)
}

describe('Screensaver', () => {
  it('renders a canvas and dismisses on click', () => {
    const onDismiss = vi.fn()
    const { container } = render(<Screensaver onDismiss={onDismiss} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeInTheDocument()
    canvas.click()
    expect(onDismiss).toHaveBeenCalled()
  })

  it('starts the matrix animation loop normally', () => {
    mockCanvasContext()
    mockReducedMotion(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    render(<Screensaver onDismiss={vi.fn()} />)
    expect(raf).toHaveBeenCalled()
  })

  it('does not run the animation loop when prefers-reduced-motion is set', () => {
    mockCanvasContext()
    mockReducedMotion(true)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    render(<Screensaver onDismiss={vi.fn()} />)
    expect(raf).not.toHaveBeenCalled()
  })
})
