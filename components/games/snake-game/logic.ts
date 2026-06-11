export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  snake: Point[] // head first
  dir: Direction
  queue: Direction[]
  food: Point
  grid: { w: number; h: number }
  foodEaten: number
  alive: boolean
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

/** rng: () => [0,1). Injected for deterministic tests. */
function placeFood(snake: Point[], w: number, h: number, rng: () => number): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  // walk from a random start until a free cell (grid is never full in practice)
  let i = Math.floor(rng() * w * h)
  for (let tries = 0; tries < w * h; tries++) {
    const cell = { x: i % w, y: Math.floor(i / w) }
    if (!occupied.has(`${cell.x},${cell.y}`)) return cell
    i = (i + 1) % (w * h)
  }
  return { x: 0, y: 0 }
}

export function createState(w: number, h: number, rng: () => number = Math.random): SnakeState {
  const cy = Math.floor(h / 2)
  const cx = Math.floor(w / 4)
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  return {
    snake,
    dir: 'RIGHT',
    queue: [],
    food: placeFood(snake, w, h, rng),
    grid: { w, h },
    foodEaten: 0,
    alive: true,
  }
}

/** Queue a turn; reversals of the effective (last queued or current) direction are ignored. */
export function enqueueDirection(state: SnakeState, dir: Direction): SnakeState {
  const effective = state.queue[state.queue.length - 1] ?? state.dir
  if (dir === effective || dir === OPPOSITE[effective]) return state
  return { ...state, queue: [...state.queue, dir] }
}

export function step(state: SnakeState, rng: () => number = Math.random): SnakeState {
  if (!state.alive) return state

  const [nextDir, ...restQueue] = state.queue.length > 0 ? state.queue : [state.dir]
  const head = state.snake[0]
  const delta = DELTA[nextDir]
  const newHead = { x: head.x + delta.x, y: head.y + delta.y }

  // wall collision
  if (newHead.x < 0 || newHead.x >= state.grid.w || newHead.y < 0 || newHead.y >= state.grid.h) {
    return { ...state, dir: nextDir, queue: restQueue, alive: false }
  }

  const ate = newHead.x === state.food.x && newHead.y === state.food.y
  // the tail cell vacates this tick unless we grow into it
  const body = ate ? state.snake : state.snake.slice(0, -1)

  // self collision (against the post-move body)
  if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
    return { ...state, dir: nextDir, queue: restQueue, alive: false }
  }

  const snake = [newHead, ...body]
  return {
    ...state,
    snake,
    dir: nextDir,
    queue: restQueue,
    foodEaten: state.foodEaten + (ate ? 1 : 0),
    food: ate ? placeFood(snake, state.grid.w, state.grid.h, rng) : state.food,
  }
}

/** Base 140ms/tick, 10ms faster every 5 food, floor 60ms. */
export function tickMs(foodEaten: number): number {
  return Math.max(60, 140 - 10 * Math.floor(foodEaten / 5))
}

export function score(foodEaten: number): number {
  return foodEaten * 10
}

export function level(foodEaten: number): number {
  return 1 + Math.floor(foodEaten / 5)
}
