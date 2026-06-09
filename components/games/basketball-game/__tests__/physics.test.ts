import { describe, it, expect } from 'vitest'
import {
  checkRimCollision,
  checkBackboardCollision,
  checkScore,
  calculateTrajectory,
  BALL_RADIUS,
  RIM_Y,
  RESTITUTION,
  GRAVITY,
} from '../physics'

const RIM_LEFT = 300
const RIM_RIGHT = 370

describe('checkRimCollision', () => {
  it('does not collide when the ball is far from the rim', () => {
    const result = checkRimCollision({ x: 100, y: 400 }, { x: 50, y: -100 }, RIM_LEFT, RIM_RIGHT)
    expect(result.collided).toBe(false)
    expect(result.newVelocity).toBeUndefined()
  })

  it('bounces off the left rim edge with restitution applied', () => {
    const velocity = { x: 100, y: 0 }
    const result = checkRimCollision({ x: RIM_LEFT + 5, y: RIM_Y }, velocity, RIM_LEFT, RIM_RIGHT)
    expect(result.collided).toBe(true)
    const speed = Math.hypot(result.newVelocity!.x, result.newVelocity!.y)
    expect(speed).toBeCloseTo(100 * RESTITUTION, 5)
  })

  it('pushes the ball away from the rim edge it hit', () => {
    // Ball slightly right of the left rim edge: bounce should point right (+x)
    const result = checkRimCollision({ x: RIM_LEFT + 5, y: RIM_Y }, { x: -50, y: 0 }, RIM_LEFT, RIM_RIGHT)
    expect(result.collided).toBe(true)
    expect(result.newVelocity!.x).toBeGreaterThan(0)
  })

  it('bounces off the right rim edge as well', () => {
    const result = checkRimCollision({ x: RIM_RIGHT - 5, y: RIM_Y }, { x: 80, y: 20 }, RIM_LEFT, RIM_RIGHT)
    expect(result.collided).toBe(true)
  })

  it('lets the ball pass cleanly through the middle of the hoop', () => {
    const middle = (RIM_LEFT + RIM_RIGHT) / 2
    const result = checkRimCollision({ x: middle, y: RIM_Y }, { x: 0, y: 120 }, RIM_LEFT, RIM_RIGHT)
    expect(result.collided).toBe(false)
  })
})

describe('checkBackboardCollision', () => {
  const BOARD_X = 400
  const TOP = 60
  const BOTTOM = 200

  it('bounces the ball back when moving toward the board inside its bounds', () => {
    const result = checkBackboardCollision({ x: BOARD_X - 5, y: 100 }, { x: 200, y: 50 }, BOARD_X, TOP, BOTTOM)
    expect(result.collided).toBe(true)
    expect(result.newVelocity!.x).toBeLessThan(0)
    expect(result.newVelocity!.y).toBeCloseTo(50 * RESTITUTION, 5)
    // Ball is pushed out of the collision zone
    expect(result.newPosition!.x).toBe(BOARD_X - BALL_RADIUS - 1)
  })

  it('enforces a minimum bounce velocity so the ball cannot stick', () => {
    const result = checkBackboardCollision({ x: BOARD_X - 5, y: 100 }, { x: 10, y: 0 }, BOARD_X, TOP, BOTTOM)
    expect(result.collided).toBe(true)
    expect(Math.abs(result.newVelocity!.x)).toBeGreaterThanOrEqual(80)
  })

  it('ignores the board when the ball moves away from it', () => {
    const result = checkBackboardCollision({ x: BOARD_X - 5, y: 100 }, { x: -200, y: 50 }, BOARD_X, TOP, BOTTOM)
    expect(result.collided).toBe(false)
  })

  it('ignores the board outside its vertical extent', () => {
    const result = checkBackboardCollision({ x: BOARD_X - 5, y: BOTTOM + 50 }, { x: 200, y: 0 }, BOARD_X, TOP, BOTTOM)
    expect(result.collided).toBe(false)
  })
})

describe('checkScore', () => {
  const inside = (RIM_LEFT + RIM_RIGHT) / 2

  it('scores when the ball crosses the rim plane downward inside the hoop', () => {
    expect(checkScore({ x: inside, y: RIM_Y + 5 }, { x: inside, y: RIM_Y - 5 }, RIM_LEFT, RIM_RIGHT)).toBe(true)
  })

  it('does not score moving upward through the hoop', () => {
    expect(checkScore({ x: inside, y: RIM_Y - 5 }, { x: inside, y: RIM_Y + 5 }, RIM_LEFT, RIM_RIGHT)).toBe(false)
  })

  it('does not score outside the rim opening', () => {
    expect(checkScore({ x: RIM_LEFT + 2, y: RIM_Y + 5 }, { x: RIM_LEFT + 2, y: RIM_Y - 5 }, RIM_LEFT, RIM_RIGHT)).toBe(false)
  })

  it('does not score when already below the rim', () => {
    expect(checkScore({ x: inside, y: RIM_Y + 20 }, { x: inside, y: RIM_Y + 10 }, RIM_LEFT, RIM_RIGHT)).toBe(false)
  })
})

describe('calculateTrajectory', () => {
  it('produces at most the requested number of steps', () => {
    const points = calculateTrajectory({ x: 100, y: 400 }, { x: 100, y: -300 }, 40)
    expect(points.length).toBeLessThanOrEqual(40)
    expect(points.length).toBeGreaterThan(0)
  })

  it('applies gravity: an upward shot eventually descends', () => {
    const points = calculateTrajectory({ x: 100, y: 400 }, { x: 50, y: -300 }, 200, 0.025)
    const apexIndex = points.reduce((min, p, i) => (p.y < points[min].y ? i : min), 0)
    expect(apexIndex).toBeGreaterThan(0)
    expect(apexIndex).toBeLessThan(points.length - 1)
  })

  it('moves forward in x for a rightward shot', () => {
    const points = calculateTrajectory({ x: 100, y: 400 }, { x: 100, y: -100 }, 10)
    expect(points[points.length - 1].x).toBeGreaterThan(100)
  })

  it('stops once the ball falls past the floor cutoff', () => {
    const points = calculateTrajectory({ x: 100, y: 590 }, { x: 0, y: 9999 }, 100, 0.025)
    expect(points.length).toBeLessThan(100)
    expect(GRAVITY).toBeGreaterThan(0)
  })
})
