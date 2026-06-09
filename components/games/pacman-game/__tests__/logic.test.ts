import { describe, it, expect } from 'vitest'
import {
  getGhostDirection,
  distanceSquared as dist2,
  type Ghost,
  type Direction,
  getOppositeDirection,
  canMove,
  getNextPosition,
  wrapPosition,
  distanceSquared,
  checkCollision,
  createInitialGhosts,
} from '../logic'
import { cloneMaze, countPellets, INITIAL_MAZE, GHOST_START } from '../maze'

// 21x21 fully open maze (every cell walkable) for ghost AI tests
const OPEN_MAZE: number[][] = Array.from({ length: 21 }, () => Array(21).fill(1))

function makeGhost(overrides: Partial<Ghost> = {}): Ghost {
  return {
    pos: { x: 5, y: 5 },
    dir: 'LEFT',
    mode: 'chase',
    color: '#f00',
    scatterTarget: { x: 18, y: 1 },
    homePos: { x: GHOST_START.x, y: GHOST_START.y },
    isHome: false,
    exitTimer: 0,
    ...overrides,
  }
}

function nextPos(pos: { x: number; y: number }, dir: Direction) {
  return {
    x: pos.x + (dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0),
    y: pos.y + (dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0),
  }
}

describe('Pac-Man Logic', () => {
  describe('getOppositeDirection', () => {
    it('returns opposite direction', () => {
      expect(getOppositeDirection('UP')).toBe('DOWN')
      expect(getOppositeDirection('DOWN')).toBe('UP')
      expect(getOppositeDirection('LEFT')).toBe('RIGHT')
      expect(getOppositeDirection('RIGHT')).toBe('LEFT')
      expect(getOppositeDirection('NONE')).toBe('NONE')
    })
  })

  describe('canMove', () => {
    it('allows movement into non-wall cells', () => {
      const maze = cloneMaze()
      // Cell (1,1) should be a pellet (1)
      expect(canMove(maze, 1, 1)).toBe(true)
    })

    it('blocks movement into walls', () => {
      const maze = cloneMaze()
      // Cell (0,0) should be a wall (0)
      expect(canMove(maze, 0, 0)).toBe(false)
    })

    it('allows tunnel wrapping (out of bounds x)', () => {
      const maze = cloneMaze()
      expect(canMove(maze, -1, 10)).toBe(true)
      expect(canMove(maze, 21, 10)).toBe(true)
    })
  })

  describe('getNextPosition', () => {
    it('calculates next position correctly', () => {
      expect(getNextPosition({ x: 5, y: 5 }, 'UP')).toEqual({ x: 5, y: 4 })
      expect(getNextPosition({ x: 5, y: 5 }, 'DOWN')).toEqual({ x: 5, y: 6 })
      expect(getNextPosition({ x: 5, y: 5 }, 'LEFT')).toEqual({ x: 4, y: 5 })
      expect(getNextPosition({ x: 5, y: 5 }, 'RIGHT')).toEqual({ x: 6, y: 5 })
    })

    it('wraps position at boundaries', () => {
      expect(getNextPosition({ x: 0, y: 5 }, 'LEFT')).toEqual({ x: 20, y: 5 })
      expect(getNextPosition({ x: 20, y: 5 }, 'RIGHT')).toEqual({ x: 0, y: 5 })
    })
  })

  describe('wrapPosition', () => {
    it('wraps x coordinate', () => {
      expect(wrapPosition({ x: -1, y: 5 })).toEqual({ x: 20, y: 5 })
      expect(wrapPosition({ x: 21, y: 5 })).toEqual({ x: 0, y: 5 })
    })

    it('does not wrap valid positions', () => {
      expect(wrapPosition({ x: 10, y: 10 })).toEqual({ x: 10, y: 10 })
    })
  })

  describe('distanceSquared', () => {
    it('calculates squared Euclidean distance', () => {
      expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25) // 3^2 + 4^2 = 25
      expect(distanceSquared({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
    })
  })

  describe('checkCollision', () => {
    it('detects collision when positions match', () => {
      expect(checkCollision({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(true)
    })

    it('returns false when positions differ', () => {
      expect(checkCollision({ x: 5, y: 5 }, { x: 5, y: 6 })).toBe(false)
    })
  })

  describe('createInitialGhosts', () => {
    it('creates 4 ghosts', () => {
      const ghosts = createInitialGhosts()
      expect(ghosts).toHaveLength(4)
    })

    it('initializes ghosts in scatter mode', () => {
      const ghosts = createInitialGhosts()
      ghosts.forEach(ghost => {
        expect(ghost.mode).toBe('scatter')
      })
    })

    it('assigns different colors to each ghost', () => {
      const ghosts = createInitialGhosts()
      const colors = new Set(ghosts.map(g => g.color))
      expect(colors.size).toBe(4)
    })
  })
})

describe('Pac-Man Maze', () => {
  describe('cloneMaze', () => {
    it('creates a deep copy of the maze', () => {
      const maze1 = cloneMaze()
      const maze2 = cloneMaze()

      // Modify maze1
      maze1[1][1] = 99

      // maze2 should be unchanged
      expect(maze2[1][1]).not.toBe(99)
    })
  })

  describe('countPellets', () => {
    it('counts all pellets in maze', () => {
      const count = countPellets(INITIAL_MAZE)
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('getGhostDirection', () => {
    it('waits in place while exitTimer has not elapsed', () => {
      const ghost = makeGhost({ exitTimer: 100, dir: 'UP' })
      expect(getGhostDirection(ghost, OPEN_MAZE, { x: 1, y: 1 }, 50)).toBe('UP')
    })

    it('chases pacman: chosen step reduces distance to pacman', () => {
      const pacman = { x: 15, y: 5 }
      const ghost = makeGhost({ mode: 'chase', pos: { x: 5, y: 5 }, dir: 'RIGHT' })
      const dir = getGhostDirection(ghost, OPEN_MAZE, pacman, 200)
      expect(dist2(nextPos(ghost.pos, dir), pacman)).toBeLessThan(dist2(ghost.pos, pacman))
    })

    it('scatter mode heads toward the scatter corner instead of pacman', () => {
      const pacman = { x: 1, y: 20 }
      const ghost = makeGhost({ mode: 'scatter', pos: { x: 10, y: 10 }, dir: 'UP', scatterTarget: { x: 18, y: 1 } })
      const dir = getGhostDirection(ghost, OPEN_MAZE, pacman, 200)
      expect(dist2(nextPos(ghost.pos, dir), ghost.scatterTarget)).toBeLessThan(dist2(ghost.pos, ghost.scatterTarget))
    })

    it('eaten mode returns toward the ghost house', () => {
      const ghost = makeGhost({ mode: 'eaten', pos: { x: 2, y: 2 }, dir: 'DOWN' })
      const dir = getGhostDirection(ghost, OPEN_MAZE, { x: 20, y: 20 }, 200)
      expect(dist2(nextPos(ghost.pos, dir), GHOST_START)).toBeLessThan(dist2(ghost.pos, GHOST_START))
    })

    it('never reverses direction in chase mode on an open board', () => {
      for (let i = 0; i < 25; i++) {
        const ghost = makeGhost({ mode: 'chase', pos: { x: 10, y: 10 }, dir: 'RIGHT' })
        const dir = getGhostDirection(ghost, OPEN_MAZE, { x: 0, y: 10 }, 200)
        expect(dir).not.toBe('LEFT')
      }
    })

    it('frightened mode picks a random valid non-reverse direction', () => {
      const seen = new Set<Direction>()
      for (let i = 0; i < 100; i++) {
        const ghost = makeGhost({ mode: 'frightened', pos: { x: 10, y: 10 }, dir: 'UP' })
        const dir = getGhostDirection(ghost, OPEN_MAZE, { x: 0, y: 0 }, 200)
        seen.add(dir)
        expect(dir).not.toBe('DOWN') // no reversing
        expect(['UP', 'LEFT', 'RIGHT']).toContain(dir)
      }
      expect(seen.size).toBeGreaterThan(1) // actually random
    })
  })
})
