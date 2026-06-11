"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, X, Trophy, Play } from "lucide-react"
import { useHighScores } from "@/lib/hooks/useHighScores"
import { createState, enqueueDirection, step, tickMs, score as scoreFor, level as levelFor, type SnakeState, type Direction } from "./logic"

interface SnakeGameProps {
  onExit: () => void
}

const CELL_SIZE = 20
const GRID_W = 30
const GRID_H = 20

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "UP", w: "UP", W: "UP",
  ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
  ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
  ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
}

export function SnakeGame({ onExit }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<"menu" | "playing" | "gameover" | "initials">("menu")
  const [foodEaten, setFoodEaten] = useState(0)

  const { scores: highScores, isLoading: scoresLoading, submitScore, isHighScore } = useHighScores("snake")
  const [playerInitials, setPlayerInitials] = useState("")
  const [finalScore, setFinalScore] = useState(0)

  const stateRef = useRef<SnakeState>(createState(GRID_W, GRID_H))
  const loopRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isHighScoreRef = useRef(isHighScore)
  useEffect(() => {
    isHighScoreRef.current = isHighScore
  })

  const startGame = useCallback(() => {
    stateRef.current = createState(GRID_W, GRID_H)
    setFoodEaten(0)
    setPhase("playing")
  }, [])

  const handleInitialsSubmit = useCallback(async () => {
    if (playerInitials.length > 0) {
      await submitScore(playerInitials, finalScore, levelFor(stateRef.current.foodEaten))
      setPlayerInitials("")
      setPhase("gameover")
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

      if (e.key === "Enter" || e.key === " ") {
        if (phase === "menu" || phase === "gameover") {
          e.preventDefault()
          startGame()
        }
        return
      }

      if (phase === "playing") {
        const dir = KEY_DIRS[e.key]
        if (dir) {
          e.preventDefault()
          stateRef.current = enqueueDirection(stateRef.current, dir)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [phase, playerInitials, startGame, onExit, handleInitialsSubmit])

  // Game loop: setTimeout chain so the cadence follows tickMs(foodEaten)
  useEffect(() => {
    if (phase !== "playing") return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const draw = (s: SnakeState) => {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // food
      ctx.fillStyle = "#f43f5e"
      ctx.shadowBlur = 12
      ctx.shadowColor = "#f43f5e"
      ctx.fillRect(s.food.x * CELL_SIZE + 2, s.food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
      // snake
      ctx.shadowColor = "#4ade80"
      s.snake.forEach((c, i) => {
        ctx.fillStyle = i === 0 ? "#fff" : "#4ade80"
        ctx.fillRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      })
      ctx.shadowBlur = 0
      ctx.strokeStyle = "#334155"
      ctx.strokeRect(0, 0, canvas.width, canvas.height)
    }

    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const next = step(stateRef.current)
      stateRef.current = next
      setFoodEaten(next.foodEaten)
      draw(next)

      if (!next.alive) {
        const points = scoreFor(next.foodEaten)
        setFinalScore(points)
        if (points > 0 && isHighScoreRef.current(points)) {
          setPhase("initials")
        } else {
          setPhase("gameover")
        }
        return
      }
      loopRef.current = setTimeout(tick, tickMs(next.foodEaten))
    }

    draw(stateRef.current)
    loopRef.current = setTimeout(tick, tickMs(stateRef.current.foodEaten))
    return () => {
      cancelled = true
      if (loopRef.current) clearTimeout(loopRef.current)
    }
  }, [phase])

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent">
      <div className="absolute top-4 left-0 right-0 flex justify-between px-8 font-mono pointer-events-none z-10">
        <div className="flex flex-col items-start gap-1 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
          <span className="text-sm tracking-widest">SCORE</span>
          <span className="text-3xl font-bold">{scoreFor(foodEaten)}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-white/50">
          <span className="text-sm tracking-widest">LEVEL</span>
          <span className="text-2xl font-bold text-white">{levelFor(foodEaten)}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_W * CELL_SIZE}
        height={GRID_H * CELL_SIZE}
        className="border border-slate-700 bg-black/50 rounded-lg shadow-2xl max-w-full"
      />

      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-8 p-12 border border-green-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(74,222,128,0.1)]">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">
              SNAKE
            </h1>
            <div className="flex flex-col gap-2 text-center text-slate-400 font-mono text-sm">
              <p>USE ARROW KEYS OR WASD TO MOVE</p>
              <p>EAT. GROW. DON&apos;T BITE YOURSELF.</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/50 rounded transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" />
              START GAME
            </button>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-green-500/20">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-green-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                      <span className="text-slate-500">LVL {hs.level}</span>
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
                        ? "border-green-400 text-green-400 bg-green-400/10"
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

      {phase === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-white/10 rounded-xl bg-black/90">
            <h2 className="text-4xl font-bold tracking-widest text-rose-400">GAME OVER</h2>
            <p className="text-white font-mono">
              {scoreFor(stateRef.current.foodEaten)} points · {stateRef.current.foodEaten} food
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
                      <span className="text-green-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                      <span className="text-slate-500">LVL {hs.level}</span>
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
                RETRY
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
              <span>[ENTER] Retry</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
