import { describe, it, expect } from 'vitest'
import { countReachable, minimax, chooseCpuMove, getNextPosition, type Direction } from '../ai'

// Deterministic "random" so move ordering is stable in tests
const noRandom = () => 0.5

describe('getNextPosition', () => {
  it('moves one cell in each direction', () => {
    expect(getNextPosition({ x: 5, y: 5 }, 'UP')).toEqual({ x: 5, y: 4 })
    expect(getNextPosition({ x: 5, y: 5 }, 'DOWN')).toEqual({ x: 5, y: 6 })
    expect(getNextPosition({ x: 5, y: 5 }, 'LEFT')).toEqual({ x: 4, y: 5 })
    expect(getNextPosition({ x: 5, y: 5 }, 'RIGHT')).toEqual({ x: 6, y: 5 })
  })
})

describe('countReachable', () => {
  it('caps the count at maxDepth on an open grid', () => {
    expect(countReachable({ x: 10, y: 10 }, new Set(), 20, 20, 50)).toBe(50)
  })

  it('counts every cell of a small enclosed region', () => {
    // 3x3 grid, no trails: 9 reachable cells
    expect(countReachable({ x: 1, y: 1 }, new Set(), 3, 3, 100)).toBe(9)
  })

  it('cannot cross trails', () => {
    // 5x1 corridor with a wall at x=2: only x=0..1 reachable from origin
    const trails = new Set(['2,0'])
    expect(countReachable({ x: 0, y: 0 }, trails, 5, 1, 100)).toBe(2)
  })
})

describe('minimax', () => {
  it('returns 0 for a head-to-head collision', () => {
    const score = minimax(3, true, { x: 4, y: 4 }, { x: 4, y: 4 }, new Set(), 10, 10, -Infinity, Infinity)
    expect(score).toBe(0)
  })

  it('returns -1000 when the CPU is fully trapped', () => {
    // CPU at (0,0) boxed in by trails on (1,0) and (0,1)
    const obstacles = new Set(['1,0', '0,1'])
    const score = minimax(2, true, { x: 0, y: 0 }, { x: 5, y: 5 }, obstacles, 10, 10, -Infinity, Infinity)
    expect(score).toBe(-1000)
  })

  it('returns 1000 when the player is fully trapped', () => {
    const obstacles = new Set(['1,0', '0,1'])
    const score = minimax(2, false, { x: 5, y: 5 }, { x: 0, y: 0 }, obstacles, 10, 10, -Infinity, Infinity)
    expect(score).toBe(1000)
  })

  it('scores leaves by reachable-space differential', () => {
    // Wall splits a 7x1 corridor: CPU side has 3 cells, player side has 2
    const obstacles = new Set(['3,0', '6,0'])
    const score = minimax(0, true, { x: 0, y: 0 }, { x: 4, y: 0 }, obstacles, 7, 1, -Infinity, Infinity)
    expect(score).toBe(3 - 2)
  })
})

describe('chooseCpuMove', () => {
  const base = { playerPos: { x: 19, y: 19 }, w: 20, h: 20, depth: 3, random: noRandom }

  it('returns null when there is no valid move', () => {
    const obstacles = new Set(['1,0', '0,1'])
    const move = chooseCpuMove({ ...base, cpuPos: { x: 0, y: 0 }, cpuDir: 'RIGHT', obstacles })
    expect(move).toBeNull()
  })

  it('takes the only escape route in a corridor', () => {
    // CPU at (0,0) in a 20-wide single-row grid: only RIGHT is possible
    const move = chooseCpuMove({
      ...base,
      h: 1,
      playerPos: { x: 19, y: 0 },
      cpuPos: { x: 0, y: 0 },
      cpuDir: 'LEFT',
      obstacles: new Set(),
    })
    expect(move).toBe('RIGHT')
  })

  it('never picks a move into a wall or trail', () => {
    // CPU in a corner with one trail: valid moves are only RIGHT
    const obstacles = new Set(['0,1'])
    const move = chooseCpuMove({ ...base, cpuPos: { x: 0, y: 0 }, cpuDir: 'UP', obstacles })
    expect(move).toBe('RIGHT')
  })

  it('avoids a dead-end pocket in favor of open space', () => {
    // 10x10 grid. CPU at (2,0). LEFT leads into a 2-cell pocket sealed by
    // trails; RIGHT leads to the open board. AI must go RIGHT.
    const obstacles = new Set(['0,1', '1,1', '2,1', '3,1', '3,0'])
    // Only LEFT is into the pocket (x=0..1,y=0); RIGHT blocked by 3,0; DOWN blocked by 2,1
    // → valid moves: LEFT only? Let's open an escape: remove 3,0 from walls.
    obstacles.delete('3,0')
    const move = chooseCpuMove({
      ...base,
      cpuPos: { x: 2, y: 0 },
      cpuDir: 'LEFT',
      obstacles,
      playerPos: { x: 9, y: 9 },
    })
    expect(move).toBe('RIGHT')
  })

  it('prefers continuing straight on an open board (anti-wiggle bonus)', () => {
    const move = chooseCpuMove({
      ...base,
      cpuPos: { x: 10, y: 10 },
      cpuDir: 'RIGHT',
      obstacles: new Set(),
      playerPos: { x: 0, y: 0 },
      depth: 1,
    })
    expect(move).toBe('RIGHT')
  })

  it('returns a valid direction for every open-board direction', () => {
    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']
    for (const dir of dirs) {
      const move = chooseCpuMove({
        ...base,
        cpuPos: { x: 10, y: 10 },
        cpuDir: dir,
        obstacles: new Set(),
        depth: 1,
      })
      expect(dirs).toContain(move)
    }
  })
})
