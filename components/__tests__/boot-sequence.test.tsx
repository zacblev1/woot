import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BootSequence } from '@/components/boot-sequence'

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

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

describe('BootSequence', () => {
  it('renders children', () => {
    render(<BootSequence><div>terminal content</div></BootSequence>)
    expect(screen.getByText('terminal content')).toBeInTheDocument()
  })

  it('shows overlay on first visit', async () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    await waitFor(() => {
      expect(container.querySelector('[data-boot-overlay]')).toBeInTheDocument()
    })
  })

  it('skips overlay if session has boot-v2-complete', () => {
    sessionStorage.setItem('boot-v2-complete', 'true')
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
  })

  it('skips overlay entirely when prefers-reduced-motion is set', async () => {
    mockReducedMotion(true)
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    // Give the mount effect a chance to run, then assert no overlay appeared
    await waitFor(() => {
      expect(screen.getByText('content')).toBeInTheDocument()
    })
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
  })

  it('dismisses on click', async () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    await waitFor(() => {
      expect(container.querySelector('[data-boot-overlay]')).toBeInTheDocument()
    })
    const overlay = container.querySelector('[data-boot-overlay]')!
    fireEvent.click(overlay)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('boot-v2-complete')).toBe('true')
  })
})
