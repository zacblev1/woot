import { describe, it, expect } from 'vitest'
import {
  getOppositeDirection,
  canMove,
  getNextPosition,
  wrapPosition,
  distanceSquared,
  checkCollision,
  createInitialGhosts,
} from '../logic'
import { cloneMaze, countPellets, INITIAL_MAZE } from '../maze'

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
})
