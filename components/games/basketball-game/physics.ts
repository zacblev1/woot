export interface Point {
  x: number
  y: number
}

export interface CollisionResult {
  collided: boolean
  newVelocity?: Point
}

// Physics constants
export const GRAVITY = 600 // pixels/sec^2
export const BALL_RADIUS = 14
export const RIM_INNER_WIDTH = 70 // The opening the ball goes through
export const RIM_Y = 130 // from top
export const RIM_THICKNESS = 5
export const RESTITUTION = 0.55
export const AIR_RESISTANCE = 0.998

// Net
export const NET_DEPTH = 35

// The rim is a horizontal ring - ball passes through the opening
// Collision only with the metal rim itself (left and right edges)

export function checkRimCollision(
  ballPos: Point,
  ballVelocity: Point,
  rimLeftX: number,
  rimRightX: number
): CollisionResult {
  const collisionRadius = BALL_RADIUS + RIM_THICKNESS / 2

  // Left rim edge collision (circle)
  const distLeft = Math.sqrt(
    Math.pow(ballPos.x - rimLeftX, 2) +
    Math.pow(ballPos.y - RIM_Y, 2)
  )

  if (distLeft < collisionRadius) {
    // Push ball away from rim
    const angle = Math.atan2(ballPos.y - RIM_Y, ballPos.x - rimLeftX)
    const speed = Math.sqrt(ballVelocity.x ** 2 + ballVelocity.y ** 2) * RESTITUTION
    return {
      collided: true,
      newVelocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
    }
  }

  // Right rim edge collision (circle)
  const distRight = Math.sqrt(
    Math.pow(ballPos.x - rimRightX, 2) +
    Math.pow(ballPos.y - RIM_Y, 2)
  )

  if (distRight < collisionRadius) {
    const angle = Math.atan2(ballPos.y - RIM_Y, ballPos.x - rimRightX)
    const speed = Math.sqrt(ballVelocity.x ** 2 + ballVelocity.y ** 2) * RESTITUTION
    return {
      collided: true,
      newVelocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
    }
  }

  return { collided: false }
}

export interface BackboardCollisionResult extends CollisionResult {
  newPosition?: Point
}

export function checkBackboardCollision(
  ballPos: Point,
  ballVelocity: Point,
  backboardX: number,
  backboardTop: number,
  backboardBottom: number
): BackboardCollisionResult {
  // Backboard is a vertical rectangle on the right side
  // Only collide if ball is moving toward the backboard (positive x velocity)
  if (
    ballPos.x + BALL_RADIUS > backboardX &&
    ballPos.x < backboardX + 10 &&
    ballPos.y > backboardTop &&
    ballPos.y < backboardBottom &&
    ballVelocity.x > 0 // Only if moving toward backboard
  ) {
    // Ensure minimum bounce velocity so ball doesn't get stuck
    const minBounceVelocity = 80
    const bounceX = Math.max(Math.abs(ballVelocity.x) * RESTITUTION, minBounceVelocity)

    return {
      collided: true,
      newVelocity: {
        x: -bounceX,
        y: ballVelocity.y * RESTITUTION
      },
      // Push ball out of collision zone
      newPosition: {
        x: backboardX - BALL_RADIUS - 1,
        y: ballPos.y
      }
    }
  }
  return { collided: false }
}

// Ball scores when it passes through the rim opening going downward
export function checkScore(
  ballPos: Point,
  prevBallPos: Point,
  rimLeftX: number,
  rimRightX: number
): boolean {
  // Ball must be within the rim horizontally
  const inHoop = ballPos.x > rimLeftX + BALL_RADIUS && ballPos.x < rimRightX - BALL_RADIUS

  // Ball must cross from above the rim to below it
  const wasAbove = prevBallPos.y < RIM_Y
  const isBelow = ballPos.y >= RIM_Y
  const movingDown = ballPos.y > prevBallPos.y

  return inHoop && wasAbove && isBelow && movingDown
}

export function calculateTrajectory(
  startPos: Point,
  velocity: Point,
  steps: number = 40,
  stepTime: number = 0.025
): Point[] {
  const points: Point[] = []
  let pos = { ...startPos }
  let vel = { ...velocity }

  for (let i = 0; i < steps; i++) {
    vel = {
      x: vel.x * AIR_RESISTANCE,
      y: vel.y + GRAVITY * stepTime
    }
    pos = {
      x: pos.x + vel.x * stepTime,
      y: pos.y + vel.y * stepTime
    }
    points.push({ ...pos })
    if (pos.y > 600) break
  }

  return points
}
