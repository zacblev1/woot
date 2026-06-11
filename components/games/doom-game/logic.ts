// DOOM-style raycaster: pure, testable game logic. The component owns the
// canvas, the keyboard, and the render loop; everything here is math.

export interface Player {
  x: number
  y: number
  angle: number
  hp?: number
}

export interface Enemy {
  x: number
  y: number
  hp: number
  biteCooldown: number
}

export interface DoomGameState {
  map: number[][]
  player: Required<Player>
  enemies: Enemy[]
  ammo: number
  kills: number
  god: boolean
  cheatBuffer: string
}

// 1-4: wall flavors · 9: the glowing exit door · 0: open floor
export const MAP_ROWS = [
  '1111111111111111',
  '1000000002000001',
  '1011110110111101',
  '1010000000000101',
  '1010111111110101',
  '1000100000010001',
  '1110103000010111',
  '1000000000310001',
  '1001111001111001',
  '1001000000001001',
  '1041011001101401',
  '1001011001101001',
  '1000000000000001',
  '1011101001011101',
  '1000001221000091',
  '1111111111111111',
]

export const ENEMY_SPAWNS: Array<{ x: number; y: number }> = [
  { x: 13.5, y: 1.5 },
  { x: 3.5, y: 5.5 },
  { x: 12.5, y: 5.5 },
  { x: 2.5, y: 12.5 },
  { x: 8.5, y: 9.5 },
  { x: 13.5, y: 12.5 },
]

export const PLAYER_SPAWN = { x: 1.5, y: 1.5, angle: 0 }

const MOVE_SPEED = 3.2 // cells/sec
const TURN_SPEED = 2.6 // rad/sec
export { TURN_SPEED }
const WALL_MARGIN = 0.2
const ENEMY_SPEED = 1.3
const BITE_RANGE = 1.0
const BITE_DAMAGE = 12
const BITE_COOLDOWN = 0.8 // seconds
const SHOT_DAMAGE = 60
const AIM_CONE = 0.12 // radians half-angle (far-range precision)
const BODY_RADIUS = 0.45 // close-range: hit if the aim ray passes through the body

export function parseMap(rows: string[]): number[][] {
  return rows.map((row) => [...row].map((c) => parseInt(c, 10)))
}

export interface RayHit {
  dist: number
  tile: number
  side: 0 | 1 // 0: hit a vertical (x) wall face, 1: horizontal (y)
}

/** Classic DDA raycast; dist is the perpendicular distance along the ray. */
export function castRay(map: number[][], px: number, py: number, angle: number): RayHit {
  const dirX = Math.cos(angle)
  const dirY = Math.sin(angle)
  let mapX = Math.floor(px)
  let mapY = Math.floor(py)
  const deltaX = dirX === 0 ? Infinity : Math.abs(1 / dirX)
  const deltaY = dirY === 0 ? Infinity : Math.abs(1 / dirY)
  const stepX = dirX < 0 ? -1 : 1
  const stepY = dirY < 0 ? -1 : 1
  let sideX = dirX < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX
  let sideY = dirY < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY
  let side: 0 | 1 = 0

  for (let i = 0; i < 256; i++) {
    if (sideX < sideY) {
      sideX += deltaX
      mapX += stepX
      side = 0
    } else {
      sideY += deltaY
      mapY += stepY
      side = 1
    }
    const tile = map[mapY]?.[mapX] ?? 1
    if (tile > 0) {
      const dist =
        side === 0 ? (mapX - px + (1 - stepX) / 2) / dirX : (mapY - py + (1 - stepY) / 2) / dirY
      return { dist, tile, side }
    }
  }
  return { dist: 64, tile: 1, side: 0 }
}

function isWall(map: number[][], x: number, y: number): boolean {
  return (map[Math.floor(y)]?.[Math.floor(x)] ?? 1) > 0
}

/** Move with per-axis collision so the player slides along walls. */
export function movePlayer(
  map: number[][],
  player: Player,
  forward: number,
  strafe: number,
  dt: number
): Player {
  const speed = MOVE_SPEED * dt
  const dx = (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * speed
  const dy = (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * speed
  let { x, y } = player
  const tryX = x + dx + Math.sign(dx) * WALL_MARGIN
  if (!isWall(map, tryX, y)) x += dx
  const tryY = y + dy + Math.sign(dy) * WALL_MARGIN
  if (!isWall(map, x, tryY)) y += dy
  return { ...player, x, y }
}

export function createGame(
  map: number[][],
  spawn: Player = PLAYER_SPAWN,
  enemySpawns: Array<{ x: number; y: number }> = ENEMY_SPAWNS
): DoomGameState {
  return {
    map,
    player: { x: spawn.x, y: spawn.y, angle: spawn.angle, hp: spawn.hp ?? 100 },
    enemies: enemySpawns.map((e) => ({ x: e.x, y: e.y, hp: 100, biteCooldown: 0 })),
    ammo: 50,
    kills: 0,
    god: false,
    cheatBuffer: '',
  }
}

function hasLineOfSight(map: number[][], ax: number, ay: number, bx: number, by: number): boolean {
  const angle = Math.atan2(by - ay, bx - ax)
  const wall = castRay(map, ax, ay, angle)
  return wall.dist >= Math.hypot(bx - ax, by - ay)
}

/** Enemies chase on sight and bite in melee range (mutates state). */
export function stepEnemies(game: DoomGameState, dt: number): void {
  const { player, map } = game
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue
    enemy.biteCooldown = Math.max(0, enemy.biteCooldown - dt)
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    if (dist <= BITE_RANGE) {
      if (enemy.biteCooldown === 0) {
        if (!game.god) player.hp = Math.max(0, player.hp - BITE_DAMAGE)
        enemy.biteCooldown = BITE_COOLDOWN
      }
      continue
    }
    if (dist > 12 || !hasLineOfSight(map, enemy.x, enemy.y, player.x, player.y)) continue
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
    const nx = enemy.x + Math.cos(angle) * ENEMY_SPEED * dt
    const ny = enemy.y + Math.sin(angle) * ENEMY_SPEED * dt
    if (!isWall(map, nx, enemy.y)) enemy.x = nx
    if (!isWall(map, enemy.x, ny)) enemy.y = ny
  }
}

/** Hitscan: nearest living enemy inside the aim cone with line of sight. */
export function shoot(game: DoomGameState): boolean {
  if (game.ammo <= 0) return false
  game.ammo--
  const { player, map } = game
  let target: Enemy | null = null
  let targetDist = Infinity
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y)
    const toEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x)
    let diff = toEnemy - player.angle
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    if (Math.abs(diff) > Math.PI / 2) continue // behind us
    // Hit when inside the precision cone OR the ray passes through the body —
    // angular cones alone make point-blank shots whiff (found in playtesting)
    const lateral = Math.abs(Math.sin(diff)) * dist
    if (Math.abs(diff) > AIM_CONE && lateral > BODY_RADIUS) continue
    if (!hasLineOfSight(map, player.x, player.y, enemy.x, enemy.y)) continue
    if (dist < targetDist) {
      target = enemy
      targetDist = dist
    }
  }
  if (!target) return false
  target.hp -= SHOT_DAMAGE
  if (target.hp <= 0) game.kills++
  return true
}

const CHEATS: Record<string, (game: DoomGameState) => void> = {
  iddqd: (game) => {
    game.god = true
    game.player.hp = 100
  },
  idkfa: (game) => {
    game.ammo = 99
  },
}

/** Feed one typed character; fires a cheat when the buffer ends with its code. */
export function feedCheat(game: DoomGameState, key: string): string | null {
  if (key.length !== 1) return null
  game.cheatBuffer = (game.cheatBuffer + key.toLowerCase()).slice(-8)
  for (const [code, apply] of Object.entries(CHEATS)) {
    if (game.cheatBuffer.endsWith(code)) {
      apply(game)
      game.cheatBuffer = ''
      return code
    }
  }
  return null
}

export function score(kills: number, hp: number): number {
  return Math.max(0, kills * 100 + hp * 10)
}

/** The exit door is solid — reaching it means standing in a cell beside it. */
export function atExit(game: DoomGameState): boolean {
  const cx = Math.floor(game.player.x)
  const cy = Math.floor(game.player.y)
  return [
    [cx + 1, cy],
    [cx - 1, cy],
    [cx, cy + 1],
    [cx, cy - 1],
  ].some(([x, y]) => game.map[y]?.[x] === 9)
}

export function allDead(game: DoomGameState): boolean {
  return game.enemies.every((e) => e.hp <= 0)
}
