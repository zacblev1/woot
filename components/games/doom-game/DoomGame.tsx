"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, X, Trophy, Skull } from "lucide-react"
import { useHighScores } from "@/lib/hooks/useHighScores"
import {
  parseMap,
  castRay,
  movePlayer,
  createGame,
  stepEnemies,
  shoot,
  feedCheat,
  score as scoreFor,
  atExit,
  allDead,
  MAP_ROWS,
  PLAYER_SPAWN,
  ENEMY_SPAWNS,
  type DoomGameState,
} from "./logic"

interface DoomGameProps {
  onExit: () => void
}

const W = 640
const H = 400
const FOV = Math.PI / 3
const TURN_SPEED = 2.6
const SHOT_COOLDOWN = 0.35

// Wall palette per tile type: [lit face, shadow face]
const WALL_COLORS: Record<number, [string, string]> = {
  1: ["#6e6e6e", "#4a4a4a"], // stone
  2: ["#8a2f23", "#5d1f17"], // hell brick
  3: ["#3f6b35", "#2a4823"], // slime
  4: ["#2f4d7a", "#1f3452"], // tech
  9: ["#1f7a3a", "#145227"], // the exit door
}

// Procedural pixel-art imp, pre-rendered once to an offscreen canvas
const IMP_ROWS = [
  "..h......h..",
  "..hh....hh..",
  "...rrrrrr...",
  "..rrrrrrrr..",
  ".rrYrrrrYrr.",
  ".rrrrrrrrrr.",
  "..rwwwwwwr..",
  "..rrrrrrrr..",
  ".rrr.rr.rrr.",
  "rrrr.rr.rrrr",
  ".r...rr...r.",
  ".....rr.....",
  "....r..r....",
  "...rr..rr...",
]
const IMP_PALETTE: Record<string, string> = {
  h: "#d8c8a8",
  r: "#a8352a",
  Y: "#ffd83d",
  w: "#e8e8e8",
}

function makeImpSprite(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const cell = 6
  const canvas = document.createElement("canvas")
  canvas.width = IMP_ROWS[0].length * cell
  canvas.height = IMP_ROWS.length * cell
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  IMP_ROWS.forEach((row, y) => {
    ;[...row].forEach((c, x) => {
      const color = IMP_PALETTE[c]
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(x * cell, y * cell, cell, cell)
    })
  })
  return canvas
}

export function DoomGame({ onExit }: DoomGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<"menu" | "playing" | "won" | "dead" | "initials">("menu")
  const [hud, setHud] = useState({ hp: 100, ammo: 50, kills: 0, total: ENEMY_SPAWNS.length, god: false, exitOpen: false })
  const [cheatToast, setCheatToast] = useState<string | null>(null)

  const { scores: highScores, isLoading: scoresLoading, submitScore, isHighScore } = useHighScores("doom")
  const [playerInitials, setPlayerInitials] = useState("")
  const [finalScore, setFinalScore] = useState(0)

  const gameRef = useRef<DoomGameState | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const loopRef = useRef<number | undefined>(undefined)
  const shotTimerRef = useRef(0)
  const flashRef = useRef(0)
  const impRef = useRef<HTMLCanvasElement | null>(null)
  const isHighScoreRef = useRef(isHighScore)
  useEffect(() => {
    isHighScoreRef.current = isHighScore
  })

  const startGame = useCallback(() => {
    gameRef.current = createGame(parseMap(MAP_ROWS), PLAYER_SPAWN, ENEMY_SPAWNS)
    keysRef.current.clear()
    shotTimerRef.current = 0
    flashRef.current = 0
    setHud({ hp: 100, ammo: 50, kills: 0, total: ENEMY_SPAWNS.length, god: false, exitOpen: false })
    setCheatToast(null)
    setPhase("playing")
  }, [])

  const handleInitialsSubmit = useCallback(async () => {
    if (playerInitials.length > 0) {
      await submitScore(playerInitials, finalScore, 1)
      setPlayerInitials("")
      setPhase("won")
    }
  }, [playerInitials, finalScore, submitScore])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "initials") {
        e.preventDefault()
        if (e.key === "Backspace") {
          setPlayerInitials((prev) => prev.slice(0, -1))
        } else if (e.key === "Enter" && playerInitials.length > 0) {
          handleInitialsSubmit()
        } else if (/^[a-zA-Z0-9]$/.test(e.key) && playerInitials.length < 3) {
          setPlayerInitials((prev) => (prev + e.key).toUpperCase())
        }
        return
      }

      if (e.key === "Escape") {
        onExit()
        return
      }

      if (e.key === "Enter") {
        if (phase === "menu" || phase === "won" || phase === "dead") {
          e.preventDefault()
          startGame()
        }
        return
      }

      if (phase === "playing") {
        keysRef.current.add(e.key.toLowerCase())
        if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
          e.preventDefault()
        }
        // Fire on the keydown itself — a tap shorter than one frame would
        // be invisible to the polled key set (the poll covers held fire)
        if (e.key === " " && gameRef.current && shotTimerRef.current === 0) {
          shotTimerRef.current = SHOT_COOLDOWN
          flashRef.current = 0.1
          shoot(gameRef.current)
        }
        if (gameRef.current) {
          const cheat = feedCheat(gameRef.current, e.key)
          if (cheat) {
            setCheatToast(cheat === "iddqd" ? "GOD MODE" : "FULL AMMO")
            setTimeout(() => setCheatToast(null), 1600)
          }
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [phase, playerInitials, startGame, onExit, handleInitialsSubmit])

  // The game loop: fixed-timestep simulation, raycast render
  useEffect(() => {
    if (phase !== "playing") {
      if (loopRef.current) cancelAnimationFrame(loopRef.current)
      return
    }
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    if (!impRef.current) impRef.current = makeImpSprite()
    ctx.imageSmoothingEnabled = false

    let last = performance.now()
    let bob = 0

    const simulate = (dt: number) => {
      const game = gameRef.current
      if (!game) return
      const keys = keysRef.current

      const forward = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0)
      const strafe = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0)
      const turn = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0)

      game.player.angle += turn * TURN_SPEED * dt
      const moved = movePlayer(game.map, game.player, forward, strafe, dt)
      game.player.x = moved.x
      game.player.y = moved.y
      if (forward !== 0 || strafe !== 0) bob += dt * 9

      shotTimerRef.current = Math.max(0, shotTimerRef.current - dt)
      flashRef.current = Math.max(0, flashRef.current - dt)
      if (keys.has(" ") && shotTimerRef.current === 0) {
        shotTimerRef.current = SHOT_COOLDOWN
        flashRef.current = 0.1
        shoot(game)
      }

      stepEnemies(game, dt)

      const exitOpen = allDead(game)
      setHud({ hp: game.player.hp, ammo: game.ammo, kills: game.kills, total: game.enemies.length, god: game.god, exitOpen })

      if (game.player.hp <= 0) {
        setPhase("dead")
        return
      }
      if (exitOpen && atExit(game)) {
        const points = scoreFor(game.kills, game.player.hp)
        setFinalScore(points)
        setPhase(points > 0 && isHighScoreRef.current(points) ? "initials" : "won")
      }
    }

    const render = () => {
      const game = gameRef.current
      if (!game) return
      const { player, map } = game
      const exitOpen = allDead(game)
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 150)
      const bobY = Math.sin(bob) * 4

      // ceiling / floor
      ctx.fillStyle = "#1a1014"
      ctx.fillRect(0, 0, W, H / 2)
      ctx.fillStyle = "#2e2620"
      ctx.fillRect(0, H / 2, W, H / 2)

      // walls
      const zBuffer = new Array<number>(W)
      for (let col = 0; col < W; col++) {
        const rayAngle = player.angle - FOV / 2 + (col / W) * FOV
        const hit = castRay(map, player.x, player.y, rayAngle)
        const perp = hit.dist * Math.cos(rayAngle - player.angle)
        zBuffer[col] = perp
        const wallH = Math.min(H * 2, H / perp)
        const top = (H - wallH) / 2 + bobY
        const [lit, shadow] = WALL_COLORS[hit.tile] ?? WALL_COLORS[1]
        ctx.fillStyle = hit.side === 0 ? lit : shadow
        ctx.fillRect(col, top, 1, wallH)
        // distance fog
        const fog = Math.min(0.85, perp / 14)
        if (fog > 0.03) {
          ctx.fillStyle = `rgba(8,4,6,${fog})`
          ctx.fillRect(col, top, 1, wallH)
        }
        // the exit door glows once the demons are down
        if (hit.tile === 9 && exitOpen) {
          ctx.fillStyle = `rgba(60,255,120,${0.35 * pulse})`
          ctx.fillRect(col, top, 1, wallH)
        }
      }

      // enemy sprites, far to near, clipped per-column against the z-buffer
      const sprite = impRef.current
      if (sprite) {
        const living = game.enemies
          .filter((e) => e.hp > 0)
          .map((e) => ({ e, dist: Math.hypot(e.x - player.x, e.y - player.y) }))
          .sort((a, b) => b.dist - a.dist)
        for (const { e, dist } of living) {
          let rel = Math.atan2(e.y - player.y, e.x - player.x) - player.angle
          while (rel > Math.PI) rel -= 2 * Math.PI
          while (rel < -Math.PI) rel += 2 * Math.PI
          if (Math.abs(rel) > FOV / 2 + 0.4) continue
          const perp = dist * Math.cos(rel)
          if (perp < 0.3) continue
          const size = H / perp
          const screenX = ((rel + FOV / 2) / FOV) * W - size / 2
          const top = H / 2 - size / 2 + bobY + size * 0.1
          const cols = Math.max(1, Math.floor(size))
          for (let i = 0; i < cols; i++) {
            const col = Math.floor(screenX + i)
            if (col < 0 || col >= W || zBuffer[col] <= perp) continue
            ctx.drawImage(sprite, (i / cols) * sprite.width, 0, sprite.width / cols, sprite.height, col, top, 1, size)
          }
        }
      }

      // crosshair
      ctx.strokeStyle = "rgba(255,255,255,0.7)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(W / 2 - 6, H / 2)
      ctx.lineTo(W / 2 + 6, H / 2)
      ctx.moveTo(W / 2, H / 2 - 6)
      ctx.lineTo(W / 2, H / 2 + 6)
      ctx.stroke()

      // shotgun + muzzle flash
      const gunX = W / 2 + Math.sin(bob) * 10
      const gunY = H - 70 + Math.abs(Math.cos(bob)) * 8
      if (flashRef.current > 0) {
        ctx.fillStyle = "rgba(255,220,90,0.9)"
        ctx.beginPath()
        ctx.arc(gunX, gunY - 18, 26, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = "#3a3a3e"
      ctx.fillRect(gunX - 14, gunY - 14, 28, 60)
      ctx.fillStyle = "#222226"
      ctx.fillRect(gunX - 8, gunY - 22, 16, 14)
      ctx.fillStyle = "#5a4632"
      ctx.fillRect(gunX - 20, gunY + 30, 40, 40)

      // minimap (top-right)
      const cell = 5
      const mmX = W - map[0].length * cell - 8
      const mmY = 8
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(mmX - 2, mmY - 2, map[0].length * cell + 4, map.length * cell + 4)
      map.forEach((row, y) =>
        row.forEach((t, x) => {
          if (t === 0) return
          ctx.fillStyle = t === 9 ? (exitOpen ? "#3cff78" : "#1f7a3a") : "#777"
          ctx.fillRect(mmX + x * cell, mmY + y * cell, cell - 1, cell - 1)
        })
      )
      for (const e of game.enemies) {
        if (e.hp <= 0) continue
        ctx.fillStyle = "#ff4040"
        ctx.fillRect(mmX + e.x * cell - 1, mmY + e.y * cell - 1, 3, 3)
      }
      ctx.fillStyle = "#ffd83d"
      ctx.fillRect(mmX + player.x * cell - 1, mmY + player.y * cell - 1, 3, 3)
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      simulate(dt)
      if (gameRef.current && phase === "playing") render()
      loopRef.current = requestAnimationFrame(frame)
    }
    loopRef.current = requestAnimationFrame(frame)
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current)
    }
  }, [phase])

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border border-red-900/60 bg-black rounded-lg shadow-2xl max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
        {phase === "playing" && (
          <>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-8 font-mono text-lg font-bold pointer-events-none select-none">
              <span className={hud.hp > 30 ? "text-amber-400" : "text-red-500 animate-pulse"}>
                HEALTH {hud.hp}%{hud.god ? " ☩" : ""}
              </span>
              <span className="text-amber-400">AMMO {hud.ammo}</span>
              <span className="text-amber-400">
                KILLS {hud.kills}/{hud.total}
              </span>
            </div>
            {hud.exitOpen && (
              <div className="absolute top-2 left-0 right-0 text-center font-mono text-sm text-green-400 animate-pulse pointer-events-none">
                THE EXIT IS OPEN — FIND THE GREEN DOOR
              </div>
            )}
            {cheatToast && (
              <div className="absolute top-8 left-0 right-0 text-center font-mono text-xl font-bold text-yellow-300 pointer-events-none">
                {cheatToast}
              </div>
            )}
          </>
        )}
      </div>

      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-7 p-12 border border-red-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(255,40,40,0.15)]">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-600 to-amber-700 tracking-tighter drop-shadow-[0_0_20px_rgba(255,60,30,0.6)]">
              DOOM
            </h1>
            <div className="flex flex-col gap-1 text-center text-slate-400 font-mono text-sm">
              <p>W/S MOVE · A/D STRAFE · ←/→ TURN · SPACE SHOOT</p>
              <p>KILL ALL {ENEMY_SPAWNS.length} DEMONS, THEN FIND THE GREEN DOOR</p>
              <p className="text-slate-600">the old codes still work.</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded transition-all hover:scale-105 active:scale-95"
            >
              <Skull className="w-5 h-5" />
              RIP AND TEAR
            </button>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-red-500/20">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-red-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER] Start</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}

      {phase === "initials" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-yellow-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(255,215,0,0.1)]">
            <div className="flex items-center gap-2 text-yellow-400 text-2xl font-bold">
              <Trophy className="w-6 h-6" />
              NEW HIGH SCORE!
            </div>
            <p className="text-4xl font-bold text-white">{finalScore.toLocaleString()}</p>
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 font-mono text-sm">ENTER YOUR INITIALS</p>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 border-2 rounded flex items-center justify-center text-3xl font-bold ${
                      i < playerInitials.length
                        ? "border-red-400 text-red-400 bg-red-400/10"
                        : i === playerInitials.length
                          ? "border-white/50 text-white animate-pulse"
                          : "border-slate-600 text-slate-600"
                    }`}
                  >
                    {playerInitials[i] || "_"}
                  </div>
                ))}
              </div>
              <button
                onClick={handleInitialsSubmit}
                disabled={playerInitials.length === 0}
                className="mt-4 px-8 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                SUBMIT
              </button>
            </div>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>TYPE INITIALS</span>
              <span>[ENTER] Submit</span>
            </div>
          </div>
        </div>
      )}

      {(phase === "won" || phase === "dead") && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-white/10 rounded-xl bg-black/90">
            <h2 className={`text-4xl font-bold tracking-widest ${phase === "won" ? "text-green-400" : "text-red-500"}`}>
              {phase === "won" ? "AREA CLEARED" : "YOU DIED"}
            </h2>
            <p className="text-white font-mono">
              {hud.kills}/{hud.total} demons · {phase === "won" ? `${finalScore.toLocaleString()} points` : "the demons feast"}
            </p>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-red-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {phase === "won" ? "AGAIN" : "RETRY"}
              </button>
              <button
                onClick={onExit}
                className="flex items-center gap-2 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
                EXIT
              </button>
            </div>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER] {phase === "won" ? "Again" : "Retry"}</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
