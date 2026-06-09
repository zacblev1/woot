// Pure CPU AI for the Tron light-cycle game.
// Extracted verbatim from the TronGame component so it can be unit tested.

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface Point {
  x: number
  y: number
}

export function getNextPosition(pos: Point, dir: Direction): Point {
  return {
    x: pos.x + (dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0),
    y: pos.y + (dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0),
  }
}

/**
 * Flood-fill heuristic: how many cells are reachable from startPos without
 * crossing a trail, capped at maxDepth expansions.
 */
export function countReachable(
  startPos: Point,
  trails: Set<string>,
  w: number,
  h: number,
  maxDepth: number = 50
): number {
  const queue: Point[] = [startPos]
  const visited = new Set<string>()
  visited.add(`${startPos.x},${startPos.y}`)
  let count = 0

  while (queue.length > 0 && count < maxDepth) {
    const curr = queue.shift()!
    count++

    const neighbors: Point[] = [
      { x: curr.x + 1, y: curr.y },
      { x: curr.x - 1, y: curr.y },
      { x: curr.x, y: curr.y + 1 },
      { x: curr.x, y: curr.y - 1 },
    ]

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`
      if (
        n.x >= 0 && n.x < w &&
        n.y >= 0 && n.y < h &&
        !trails.has(key) &&
        !visited.has(key)
      ) {
        visited.add(key)
        queue.push(n)
      }
    }
  }
  return count
}

/**
 * Minimax with alpha-beta pruning. Positive scores favor the CPU.
 * Trapped player => 1000, trapped CPU => -1000, head-to-head => 0;
 * leaves are scored by reachable-space differential.
 */
export function minimax(
  depth: number,
  isMaximizing: boolean,
  cpuPosition: Point,
  playerPosition: Point,
  obstacles: Set<string>,
  w: number,
  h: number,
  alpha: number,
  beta: number
): number {
  // Head-to-head collision
  if (cpuPosition.x === playerPosition.x && cpuPosition.y === playerPosition.y) {
    return 0 // Draw
  }

  // Leaf node - use heuristic (space available to each player)
  if (depth === 0) {
    const cpuSpace = countReachable(cpuPosition, obstacles, w, h, 30)
    const playerSpace = countReachable(playerPosition, obstacles, w, h, 30)
    return cpuSpace - playerSpace
  }

  const moves: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

  if (isMaximizing) {
    // CPU's turn - maximize
    let maxEval = -Infinity
    let hasValidMove = false

    for (const move of moves) {
      const next = getNextPosition(cpuPosition, move)
      const nextKey = `${next.x},${next.y}`

      if (next.x < 0 || next.x >= w || next.y < 0 || next.y >= h) continue
      if (obstacles.has(nextKey)) continue
      if (next.x === playerPosition.x && next.y === playerPosition.y) continue

      hasValidMove = true

      // Add current CPU position to obstacles (trail left behind)
      const currentKey = `${cpuPosition.x},${cpuPosition.y}`
      obstacles.add(currentKey)

      const evalScore = minimax(depth - 1, false, next, playerPosition, obstacles, w, h, alpha, beta)

      obstacles.delete(currentKey)

      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break // Prune
    }

    // No valid moves = CPU is trapped and loses
    return hasValidMove ? maxEval : -1000
  } else {
    // Player's turn - minimize (simulate player trying to survive)
    let minEval = Infinity
    let hasValidMove = false

    for (const move of moves) {
      const next = getNextPosition(playerPosition, move)
      const nextKey = `${next.x},${next.y}`

      if (next.x < 0 || next.x >= w || next.y < 0 || next.y >= h) continue
      if (obstacles.has(nextKey)) continue
      if (next.x === cpuPosition.x && next.y === cpuPosition.y) continue

      hasValidMove = true

      // Add current player position to obstacles (trail left behind)
      const currentKey = `${playerPosition.x},${playerPosition.y}`
      obstacles.add(currentKey)

      const evalScore = minimax(depth - 1, true, cpuPosition, next, obstacles, w, h, alpha, beta)

      obstacles.delete(currentKey)

      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break // Prune
    }

    // No valid moves = player is trapped and CPU wins
    return hasValidMove ? minEval : 1000
  }
}

export interface CpuMoveInput {
  cpuPos: Point
  playerPos: Point
  cpuDir: Direction
  obstacles: Set<string>
  w: number
  h: number
  depth?: number
  /** Injectable randomness (move-order shuffle); defaults to Math.random */
  random?: () => number
}

/**
 * Choose the CPU's next direction, or null when it has no valid move (dead).
 * Prefers continuing straight (small bonus) to reduce wiggling.
 */
export function chooseCpuMove({
  cpuPos,
  playerPos,
  cpuDir,
  obstacles,
  w,
  h,
  depth = 5,
  random = Math.random,
}: CpuMoveInput): Direction | null {
  const moves: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

  // 1. Identify valid moves
  const validMoves = moves.filter((move) => {
    const next = getNextPosition(cpuPos, move)
    if (next.x < 0 || next.x >= w || next.y < 0 || next.y >= h) return false
    if (obstacles.has(`${next.x},${next.y}`)) return false
    if (next.x === playerPos.x && next.y === playerPos.y) return false
    return true
  })

  if (validMoves.length === 0) return null // Dead

  // 2. Choose best move using minimax; prioritize current direction
  let bestMove = validMoves[0]
  let maxVal = -Infinity

  const orderedMoves = [
    ...validMoves.filter((m) => m === cpuDir),
    ...validMoves.filter((m) => m !== cpuDir).sort(() => random() - 0.5),
  ]

  for (const move of orderedMoves) {
    const next = getNextPosition(cpuPos, move)

    // Add CPU's current position to obstacles (trail left behind when moving)
    const trailKey = `${cpuPos.x},${cpuPos.y}`
    obstacles.add(trailKey)

    // Evaluate this move - player responds trying to minimize CPU's score
    let val = minimax(depth, false, next, playerPos, obstacles, w, h, -Infinity, Infinity)

    // Small bonus for continuing in same direction (reduces wiggling)
    if (move === cpuDir) {
      val += 0.5
    }

    obstacles.delete(trailKey)

    if (val > maxVal) {
      maxVal = val
      bestMove = move
    }
  }

  return bestMove
}
