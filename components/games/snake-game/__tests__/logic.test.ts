import { describe, it, expect } from 'vitest'
import {
  createState,
  enqueueDirection,
  step,
  tickMs,
  score,
  type SnakeState,
} from '../logic'

// rng that always returns the same cell (deterministic food placement)
const rngAt = (x: number, y: number, w = 20) => () => (y * w + x) / (w * 20)

function state(overrides: Partial<SnakeState> = {}): SnakeState {
  return { ...createState(20, 20, rngAt(15, 10)), ...overrides }
}

describe('createState', () => {
  it('starts a 3-cell snake heading right, food not on the snake', () => {
    const s = createState(20, 20, rngAt(15, 10))
    expect(s.snake).toHaveLength(3)
    expect(s.dir).toBe('RIGHT')
    expect(s.alive).toBe(true)
    expect(s.foodEaten).toBe(0)
    expect(s.snake.some((c) => c.x === s.food.x && c.y === s.food.y)).toBe(false)
  })
})

describe('enqueueDirection', () => {
  it('queues a turn', () => {
    const s = enqueueDirection(state(), 'UP')
    expect(s.queue).toEqual(['UP'])
  })
  it('ignores a reversal of the effective direction', () => {
    expect(enqueueDirection(state(), 'LEFT').queue).toEqual([])
    // queued UP makes LEFT legal afterwards
    const s = enqueueDirection(enqueueDirection(state(), 'UP'), 'LEFT')
    expect(s.queue).toEqual(['UP', 'LEFT'])
    // ...but reversing the queued UP with DOWN is ignored
    const s2 = enqueueDirection(enqueueDirection(state(), 'UP'), 'DOWN')
    expect(s2.queue).toEqual(['UP'])
  })
})

describe('step', () => {
  it('moves the head one cell and drops the tail', () => {
    const before = state()
    const after = step(before, rngAt(15, 10))
    expect(after.snake[0]).toEqual({ x: before.snake[0].x + 1, y: before.snake[0].y })
    expect(after.snake).toHaveLength(before.snake.length)
  })
  it('eating food grows the snake and respawns food elsewhere', () => {
    const before = state()
    // place food directly ahead of the head
    before.food = { x: before.snake[0].x + 1, y: before.snake[0].y }
    const after = step(before, rngAt(2, 2))
    expect(after.foodEaten).toBe(1)
    expect(after.snake).toHaveLength(before.snake.length + 1)
    expect(after.food).toEqual({ x: 2, y: 2 })
  })
  it('dies on the wall', () => {
    let s = state()
    for (let i = 0; i < 30 && s.alive; i++) s = step(s, rngAt(2, 2))
    expect(s.alive).toBe(false)
  })
  it('dies on itself', () => {
    // a 5-long snake turning in a tight square bites its own body
    let s = state()
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y }
    s = step(s, rngAt(18, 18)) // eat → length 4
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y }
    s = step(s, rngAt(18, 18)) // eat → length 5
    s = step(enqueueDirection(s, 'UP'), rngAt(18, 18))
    s = step(enqueueDirection(s, 'LEFT'), rngAt(18, 18))
    s = step(enqueueDirection(s, 'DOWN'), rngAt(18, 18))
    expect(s.alive).toBe(false)
  })
  it('consumes one queued direction per tick', () => {
    let s = enqueueDirection(enqueueDirection(state(), 'UP'), 'LEFT')
    s = step(s, rngAt(2, 2))
    expect(s.dir).toBe('UP')
    expect(s.queue).toEqual(['LEFT'])
  })
})

describe('tickMs / score', () => {
  it('speeds up every 5 food with a floor', () => {
    expect(tickMs(0)).toBe(140)
    expect(tickMs(4)).toBe(140)
    expect(tickMs(5)).toBe(130)
    expect(tickMs(10)).toBe(120)
    expect(tickMs(1000)).toBe(60)
  })
  it('scores 10 per food', () => {
    expect(score(7)).toBe(70)
  })
})
