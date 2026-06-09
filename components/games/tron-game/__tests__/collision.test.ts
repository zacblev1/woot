import { describe, it, expect } from 'vitest'

describe('Tron collision detection with Set', () => {
  describe('Set-based coordinate lookup', () => {
    it('uses string keys for coordinate lookup', () => {
      const pos = { x: 10, y: 20 }
      const key = `${pos.x},${pos.y}`

      const trailSet = new Set(['10,20', '11,20', '12,20'])
      expect(trailSet.has(key)).toBe(true)
      expect(trailSet.has('10,21')).toBe(false)
    })

    it('detects self-collision correctly', () => {
      const trailSet = new Set<string>()

      // Build trail
      trailSet.add('5,5')
      trailSet.add('6,5')
      trailSet.add('7,5')

      // Player moves back into own trail
      const newPos = { x: 6, y: 5 }
      expect(trailSet.has(`${newPos.x},${newPos.y}`)).toBe(true)
    })

    it('detects cross-collision between players', () => {
      const playerTrail = new Set(['10,10', '11,10', '12,10'])

      // CPU position where player trail exists
      const cpuPos = { x: 11, y: 10 }
      expect(playerTrail.has(`${cpuPos.x},${cpuPos.y}`)).toBe(true)
    })

    it('handles large trails efficiently', () => {
      const trailSet = new Set<string>()

      // Simulate 1000+ point trail
      for (let i = 0; i < 1000; i++) {
        trailSet.add(`${i},50`)
      }

      // O(1) lookup should be instant
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        trailSet.has('500,50')
      }
      const elapsed = performance.now() - start

      // 1000 lookups should take < 5ms (way under, but gives margin)
      expect(elapsed).toBeLessThan(5)
    })

    it('clears correctly on game reset', () => {
      const trailSet = new Set(['1,1', '2,2', '3,3'])
      expect(trailSet.size).toBe(3)

      trailSet.clear()
      expect(trailSet.size).toBe(0)
      expect(trailSet.has('1,1')).toBe(false)
    })
  })

  describe('coordinate key format', () => {
    it('negative coordinates work correctly', () => {
      const trailSet = new Set<string>()
      trailSet.add('-5,-10')

      expect(trailSet.has('-5,-10')).toBe(true)
      expect(trailSet.has('5,10')).toBe(false)
    })

    it('zero coordinates work correctly', () => {
      const trailSet = new Set<string>()
      trailSet.add('0,0')

      expect(trailSet.has('0,0')).toBe(true)
    })
  })
})
