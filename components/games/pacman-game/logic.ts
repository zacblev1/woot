import { MAZE_WIDTH, MAZE_HEIGHT, GHOST_START } from './maze'

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'
export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'eaten'

export interface Point {
  x: number
  y: number
}

export interface Ghost {
  pos: Point
  dir: Direction
  mode: GhostMode
  color: string
  scatterTarget: Point
  homePos: Point
  isHome: boolean
  exitTimer: number
}

// Ghost colors and scatter targets (corners)
const GHOST_CONFIGS = [
  { color: '#ff0000', scatterTarget: { x: MAZE_WIDTH - 3, y: 1 }, exitTimer: 0 },      // Blinky (red)
  { color: '#ffb8ff', scatterTarget: { x: 2, y: 1 }, exitTimer: 50 },                  // Pinky (pink)
  { color: '#00ffff', scatterTarget: { x: MAZE_WIDTH - 3, y: MAZE_HEIGHT - 2 }, exitTimer: 100 }, // Inky (cyan)
  { color: '#ffb852', scatterTarget: { x: 2, y: MAZE_HEIGHT - 2 }, exitTimer: 150 },   // Clyde (orange)
]

export function createInitialGhosts(): Ghost[] {
  return GHOST_CONFIGS.map((config, i) => ({
    pos: { x: GHOST_START.x, y: GHOST_START.y },
    dir: 'LEFT' as Direction,
    mode: 'scatter' as GhostMode,
    color: config.color,
    scatterTarget: config.scatterTarget,
    homePos: { x: GHOST_START.x, y: GHOST_START.y },
    isHome: true,
    exitTimer: config.exitTimer,
  }))
}

export function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'UP': return 'DOWN'
    case 'DOWN': return 'UP'
    case 'LEFT': return 'RIGHT'
    case 'RIGHT': return 'LEFT'
    default: return 'NONE'
  }
}

export function canMove(maze: number[][], x: number, y: number): boolean {
  // Handle tunnel wrapping
  if (x < 0 || x >= MAZE_WIDTH) return true
  if (y < 0 || y >= MAZE_HEIGHT) return false
  return maze[y][x] !== 0
}

export function wrapPosition(pos: Point): Point {
  let { x, y } = pos
  if (x < 0) x = MAZE_WIDTH - 1
  if (x >= MAZE_WIDTH) x = 0
  return { x, y }
}

export function getNextPosition(pos: Point, dir: Direction): Point {
  const next = { ...pos }
  switch (dir) {
    case 'UP': next.y--; break
    case 'DOWN': next.y++; break
    case 'LEFT': next.x--; break
    case 'RIGHT': next.x++; break
  }
  return wrapPosition(next)
}

// Euclidean distance squared (no sqrt needed for comparison)
export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

// Get valid moves from a position (excluding reverse unless necessary)
function getValidMoves(maze: number[][], pos: Point, currentDir: Direction, allowReverse: boolean = false): Direction[] {
  const directions: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'] // Priority order like original
  const opposite = getOppositeDirection(currentDir)

  const validMoves = directions.filter(dir => {
    if (!allowReverse && dir === opposite) return false
    const next = getNextPosition(pos, dir)
    return canMove(maze, next.x, next.y)
  })

  // If no valid moves, allow reverse
  if (validMoves.length === 0) {
    return directions.filter(dir => {
      const next = getNextPosition(pos, dir)
      return canMove(maze, next.x, next.y)
    })
  }

  return validMoves
}

// Ghost AI - choose direction toward target
export function getGhostDirection(
  ghost: Ghost,
  maze: number[][],
  pacman: Point,
  frameCount: number
): Direction {
  const { pos, dir, mode, scatterTarget, isHome, exitTimer } = ghost

  // Still waiting to exit
  if (exitTimer > frameCount) {
    return dir
  }

  // Determine target based on mode
  let target: Point
  if (mode === 'frightened') {
    // Random movement when frightened - pick random valid direction
    const validMoves = getValidMoves(maze, pos, dir, false)
    if (validMoves.length === 0) return dir
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  } else if (mode === 'eaten') {
    // Return to home
    target = GHOST_START
  } else if (mode === 'scatter') {
    target = scatterTarget
  } else {
    // Chase mode - target pacman
    target = pacman
  }

  // Get valid moves
  const validMoves = getValidMoves(maze, pos, dir, mode === 'frightened')

  if (validMoves.length === 0) return dir
  if (validMoves.length === 1) return validMoves[0]

  // Choose move that gets closest to target
  let bestMove = validMoves[0]
  let bestDist = Infinity

  for (const move of validMoves) {
    const nextPos = getNextPosition(pos, move)
    const dist = distanceSquared(nextPos, target)
    if (dist < bestDist) {
      bestDist = dist
      bestMove = move
    }
  }

  return bestMove
}

// Check collision between pacman and ghost
export function checkCollision(pacman: Point, ghost: Point): boolean {
  return pacman.x === ghost.x && pacman.y === ghost.y
}

// Score values
export const PELLET_SCORE = 10
export const POWER_PELLET_SCORE = 50
export const GHOST_SCORE = [200, 400, 800, 1600]

export const FRIGHTENED_DURATION = 360 // ~6 seconds at 60fps
