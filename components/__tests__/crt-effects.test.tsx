import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CRTEffects } from '@/components/crt-effects'

describe('CRTEffects', () => {
  it('renders scan lines and vignette overlays', () => {
    const { container } = render(<CRTEffects />)
    const overlays = container.querySelectorAll('[data-crt]')
    expect(overlays).toHaveLength(2)
  })

  it('overlays have pointer-events-none', () => {
    const { container } = render(<CRTEffects />)
    const overlays = container.querySelectorAll('[data-crt]')
    overlays.forEach(el => {
      expect(el.className).toContain('pointer-events-none')
    })
  })
})
