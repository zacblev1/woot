import { describe, it, expect } from 'vitest'
import {
  parseMap,
  castRay,
  movePlayer,
  createGame,
  stepEnemies,
  shoot,
  feedCheat,
  score,
  atExit,
  allDead,
  MAP_ROWS,
  ENEMY_SPAWNS,
  PLAYER_SPAWN,
} from '../logic'

// A tiny 8x8 test arena: border walls, one inner pillar at (5,3)..(5,4)
const TEST_ROWS = [
  '11111111',
  '10000001',
  '10000001',
  '10000101',
  '10000101',
  '10000001',
  '10000001',
  '11111111',
]

describe('parseMap', () => {
  it('parses rows into a numeric grid', () => {
    const map = parseMap(TEST_ROWS)
    expect(map[0][0]).toBe(1)
    expect(map[1][1]).toBe(0)
    expect(map[3][5]).toBe(1)
  })
  it('the shipped map is rectangular with solid borders', () => {
    const map = parseMap(MAP_ROWS)
    const w = map[0].length
    expect(map.every((r) => r.length === w)).toBe(true)
    expect(map[0].every((t) => t > 0)).toBe(true)
    expect(map[map.length - 1].every((t) => t > 0)).toBe(true)
    expect(map.every((r) => r[0] > 0 && r[w - 1] > 0)).toBe(true)
    // and it contains an exit tile (9)
    expect(map.flat()).toContain(9)
  })
})

describe('castRay', () => {
  const map = parseMap(TEST_ROWS)
  it('measures the perpendicular distance to a wall straight ahead', () => {
    // facing +X from (2.5, 1.5): pillar column at x=5 is open on row 1 — wall at x=7
    const east = castRay(map, 2.5, 1.5, 0)
    expect(east.dist).toBeCloseTo(4.5, 5)
    // facing +X from (2.5, 3.5): pillar at x=5 blocks at distance 2.5
    const blocked = castRay(map, 2.5, 3.5, 0)
    expect(blocked.dist).toBeCloseTo(2.5, 5)
    expect(blocked.tile).toBe(1)
  })
  it('measures vertical hits too', () => {
    // facing -Y from (2.5, 3.5): row 0 is wall, its boundary is y=1 → dist 2.5
    const north = castRay(map, 2.5, 3.5, -Math.PI / 2)
    expect(north.dist).toBeCloseTo(2.5, 5)
    expect(north.side).toBe(1)
  })
})

describe('movePlayer', () => {
  const map = parseMap(TEST_ROWS)
  it('moves freely in open space', () => {
    const p = movePlayer(map, { x: 2.5, y: 2.5, angle: 0 }, 1, 0, 0.5)
    expect(p.x).toBeGreaterThan(2.5)
    expect(p.y).toBeCloseTo(2.5, 5)
  })
  it('cannot walk through walls (slides instead)', () => {
    const p = movePlayer(map, { x: 1.3, y: 2.5, angle: Math.PI }, 1, 0, 5)
    expect(p.x).toBeGreaterThan(1) // clamped before the x=1 wall (with margin)
  })
})

describe('enemies', () => {
  const map = parseMap(TEST_ROWS)
  it('walk toward the player when alive', () => {
    const game = createGame(map, { x: 2.5, y: 2.5, angle: 0 }, [{ x: 6.5, y: 2.5 }])
    const before = game.enemies[0].x
    stepEnemies(game, 0.2)
    expect(game.enemies[0].x).toBeLessThan(before)
  })
  it('damage the player in melee range on cooldown', () => {
    const game = createGame(map, { x: 2.5, y: 2.5, angle: 0 }, [{ x: 3.0, y: 2.5 }])
    stepEnemies(game, 0.2)
    expect(game.player.hp).toBeLessThan(100)
  })
  it('dead enemies do not move or bite', () => {
    const game = createGame(map, { x: 2.5, y: 2.5, angle: 0 }, [{ x: 3.0, y: 2.5 }])
    game.enemies[0].hp = 0
    const before = { ...game.enemies[0] }
    stepEnemies(game, 0.2)
    expect(game.enemies[0].x).toBe(before.x)
    expect(game.player.hp).toBe(100)
  })
})

describe('shoot', () => {
  const map = parseMap(TEST_ROWS)
  it('hits the nearest enemy in the aim cone and spends ammo', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [
      { x: 5.5, y: 1.5 },
      { x: 3.5, y: 1.5 },
    ])
    const hit = shoot(game)
    expect(hit).toBe(true)
    expect(game.ammo).toBe(49)
    // nearest (x=3.5) took the damage
    expect(game.enemies[1].hp).toBeLessThan(100)
    expect(game.enemies[0].hp).toBe(100)
  })
  it('point-blank shots land even when the angle is wide (body shot)', () => {
    // enemy 1 cell away, 0.35 lateral: ~0.34 rad off-axis — way outside the
    // far-range cone, but its body is right in front of the barrel
    const game = createGame(map, { x: 2.5, y: 2.5, angle: 0 }, [{ x: 3.5, y: 2.85 }])
    expect(shoot(game)).toBe(true)
    expect(game.enemies[0].hp).toBeLessThan(100)
  })

  it('misses enemies outside the cone', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [{ x: 1.5, y: 5.5 }])
    expect(shoot(game)).toBe(false)
    expect(game.enemies[0].hp).toBe(100)
  })
  it('cannot fire on empty', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [{ x: 3.5, y: 1.5 }])
    game.ammo = 0
    expect(shoot(game)).toBe(false)
  })
  it('kills increment the counter', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [{ x: 3.5, y: 1.5 }])
    game.enemies[0].hp = 10
    shoot(game)
    expect(game.enemies[0].hp).toBeLessThanOrEqual(0)
    expect(game.kills).toBe(1)
  })
})

describe('cheats', () => {
  const map = parseMap(TEST_ROWS)
  it('iddqd grants god mode', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [])
    for (const k of 'iddqd') feedCheat(game, k)
    expect(game.god).toBe(true)
  })
  it('idkfa refills ammo', () => {
    const game = createGame(map, { x: 1.5, y: 1.5, angle: 0 }, [])
    game.ammo = 1
    for (const k of 'xidkfa') feedCheat(game, k)
    expect(game.ammo).toBe(99)
  })
  it('god mode blocks bites', () => {
    const game = createGame(map, { x: 2.5, y: 2.5, angle: 0 }, [{ x: 3.0, y: 2.5 }])
    game.god = true
    stepEnemies(game, 0.2)
    expect(game.player.hp).toBe(100)
  })
})

describe('the shipped level is actually playable', () => {
  const map = parseMap(MAP_ROWS)

  function reachable(): Set<string> {
    // flood fill from the player spawn through open cells
    const seen = new Set<string>()
    const queue = [[Math.floor(PLAYER_SPAWN.x), Math.floor(PLAYER_SPAWN.y)]]
    while (queue.length) {
      const [x, y] = queue.pop()!
      const key = `${x},${y}`
      if (seen.has(key) || (map[y]?.[x] ?? 1) > 0) continue
      seen.add(key)
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    return seen
  }

  it('every open cell is reachable from the spawn (no sealed rooms)', () => {
    const open = map.flatMap((row, y) => row.map((t, x) => (t === 0 ? `${x},${y}` : null))).filter(Boolean)
    const seen = reachable()
    expect([...seen].sort()).toEqual((open as string[]).sort())
  })

  it('every demon spawns on a reachable open cell', () => {
    const seen = reachable()
    for (const e of ENEMY_SPAWNS) {
      expect(seen.has(`${Math.floor(e.x)},${Math.floor(e.y)}`)).toBe(true)
    }
  })

  it('the exit door touches a reachable cell', () => {
    const seen = reachable()
    let touches = false
    map.forEach((row, y) =>
      row.forEach((t, x) => {
        if (t !== 9) return
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (seen.has(`${nx},${ny}`)) touches = true
        }
      })
    )
    expect(touches).toBe(true)
  })

  it('atExit fires beside the door, allDead tracks the demons', () => {
    const game = createGame(map, { x: 13.5, y: 14.5, angle: 0 }, [{ x: 3.5, y: 5.5 }])
    expect(atExit(game)).toBe(true)
    expect(allDead(game)).toBe(false)
    game.enemies[0].hp = 0
    expect(allDead(game)).toBe(true)
    const elsewhere = createGame(map, PLAYER_SPAWN, [])
    expect(atExit(elsewhere)).toBe(false)
  })
})

describe('score', () => {
  it('rewards kills and remaining health, never negative', () => {
    expect(score(5, 80)).toBe(5 * 100 + 80 * 10)
    expect(score(0, 0)).toBe(0)
  })
})
