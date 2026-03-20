import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BootSequence } from '@/components/boot-sequence'

beforeEach(() => {
  sessionStorage.clear()
})

describe('BootSequence', () => {
  it('renders children', () => {
    render(<BootSequence><div>terminal content</div></BootSequence>)
    expect(screen.getByText('terminal content')).toBeInTheDocument()
  })

  it('shows overlay on first visit', () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    expect(container.querySelector('[data-boot-overlay]')).toBeInTheDocument()
  })

  it('skips overlay if session has boot-v2-complete', () => {
    sessionStorage.setItem('boot-v2-complete', 'true')
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
  })

  it('dismisses on click', () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    const overlay = container.querySelector('[data-boot-overlay]')!
    fireEvent.click(overlay)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('boot-v2-complete')).toBe('true')
  })
})
