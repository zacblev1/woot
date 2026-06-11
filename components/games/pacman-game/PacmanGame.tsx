"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Play, RefreshCw, X, Trophy } from "lucide-react"
import { useHighScores } from "@/lib/hooks/useHighScores"
import { useSwipe } from "@/lib/hooks/useSwipe"
import {
  MAZE_WIDTH, MAZE_HEIGHT, PACMAN_START, GHOST_START,
  cloneMaze, countPellets
} from './maze'
import {
  type Direction, type Ghost, type Point,
  createInitialGhosts, getNextPosition, canMove,
  getGhostDirection, checkCollision,
  PELLET_SCORE, POWER_PELLET_SCORE, GHOST_SCORE,
  FRIGHTENED_DURATION
} from './logic'

interface PacmanGameProps {
  onExit: () => void
}

const CELL_SIZE = 20
const PACMAN_SPEED = 8 // Cells per second
const GHOST_SPEED = 7
const GHOST_FRIGHTENED_SPEED = 4

export function PacmanGame({ onExit }: PacmanGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "levelup" | "initials">("menu")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [, setPelletsRemaining] = useState(0)

  // High scores
  const { scores: highScores, isLoading: scoresLoading, submitScore, isHighScore } = useHighScores('pacman')
  const [playerInitials, setPlayerInitials] = useState("")
  const [finalScore, setFinalScore] = useState(0)

  // Game state refs
  const mazeRef = useRef<number[][]>(cloneMaze())
  const pacmanPos = useRef<Point>({ ...PACMAN_START })
  const pacmanDir = useRef<Direction>('NONE')
  const pacmanNextDir = useRef<Direction>('NONE')
  const pacmanMoveTimer = useRef(0)
  const ghostsRef = useRef<Ghost[]>(createInitialGhosts())
  const ghostMoveTimers = useRef<number[]>([0, 0, 0, 0])
  const frightenedTimer = useRef(0)
  const ghostsEaten = useRef(0)
  const frameCount = useRef(0)
  const gameLoopRef = useRef<number | undefined>(undefined)
  const modeTimer = useRef(0) // For scatter/chase mode switching

  // Animation
  const mouthAngle = useRef(0)
  const mouthOpening = useRef(true)

  const resetLevel = useCallback((nextLevel: boolean = false) => {
    mazeRef.current = cloneMaze()
    pacmanPos.current = { ...PACMAN_START }
    pacmanDir.current = 'NONE'
    pacmanNextDir.current = 'NONE'
    pacmanMoveTimer.current = 0
    ghostsRef.current = createInitialGhosts()
    ghostMoveTimers.current = [0, 0, 0, 0]
    frightenedTimer.current = 0
    ghostsEaten.current = 0
    frameCount.current = 0
    modeTimer.current = 0
    setPelletsRemaining(countPellets(mazeRef.current))

    if (nextLevel) {
      setLevel(l => l + 1)
    }
  }, [])

  const startGame = useCallback((continueGame: boolean = false) => {
    if (!continueGame) {
      setScore(0)
      setLives(3)
      setLevel(1)
    }
    resetLevel(continueGame)
    setGameState("playing")
  }, [resetLevel])

  const handleDeath = useCallback(() => {
    setLives(l => {
      const newLives = l - 1
      if (newLives <= 0) {
        setFinalScore(score)
        if (isHighScore(score) && score > 0) {
          setGameState("initials")
        } else {
          setGameState("gameover")
        }
      } else {
        // Reset positions but keep score/pellets
        pacmanPos.current = { ...PACMAN_START }
        pacmanDir.current = 'NONE'
        pacmanNextDir.current = 'NONE'
        pacmanMoveTimer.current = 0
        ghostsRef.current = createInitialGhosts()
        ghostMoveTimers.current = [0, 0, 0, 0]
        frightenedTimer.current = 0
        ghostsEaten.current = 0
        frameCount.current = 0
        modeTimer.current = 0
      }
      return newLives
    })
  }, [score, isHighScore])

  const handleInitialsSubmit = useCallback(async () => {
    if (playerInitials.length > 0) {
      await submitScore(playerInitials, finalScore, level)
      setPlayerInitials("")
      setGameState("gameover")
    }
  }, [playerInitials, finalScore, level, submitScore])

  // Render function
  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const maze = mazeRef.current
    const offsetX = (canvas.width - MAZE_WIDTH * CELL_SIZE) / 2
    const offsetY = (canvas.height - MAZE_HEIGHT * CELL_SIZE) / 2

    // Draw maze
    for (let y = 0; y < MAZE_HEIGHT; y++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        const cell = maze[y][x]
        const px = offsetX + x * CELL_SIZE
        const py = offsetY + y * CELL_SIZE

        if (cell === 0) {
          ctx.fillStyle = "#2121de"
          ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4)
        } else if (cell === 1) {
          ctx.fillStyle = "#ffb897"
          ctx.beginPath()
          ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 3, 0, Math.PI * 2)
          ctx.fill()
        } else if (cell === 2) {
          const pulse = Math.sin(frameCount.current * 0.1) * 0.3 + 0.7
          ctx.fillStyle = `rgba(255, 184, 151, ${pulse})`
          ctx.beginPath()
          ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Draw Pac-Man
    const pacX = offsetX + pacmanPos.current.x * CELL_SIZE + CELL_SIZE / 2
    const pacY = offsetY + pacmanPos.current.y * CELL_SIZE + CELL_SIZE / 2
    const pacRadius = CELL_SIZE / 2 - 1

    ctx.fillStyle = "#ffff00"
    ctx.beginPath()

    let startAngle = 0
    switch (pacmanDir.current) {
      case 'RIGHT': startAngle = 0; break
      case 'DOWN': startAngle = Math.PI / 2; break
      case 'LEFT': startAngle = Math.PI; break
      case 'UP': startAngle = -Math.PI / 2; break
    }

    const mouth = mouthAngle.current
    ctx.arc(pacX, pacY, pacRadius, startAngle + mouth, startAngle + Math.PI * 2 - mouth)
    ctx.lineTo(pacX, pacY)
    ctx.fill()

    // Draw ghosts
    ghostsRef.current.forEach(ghost => {
      const gx = offsetX + ghost.pos.x * CELL_SIZE + CELL_SIZE / 2
      const gy = offsetY + ghost.pos.y * CELL_SIZE + CELL_SIZE / 2
      const gr = CELL_SIZE / 2 - 1

      let color = ghost.color
      if (ghost.mode === 'frightened') {
        if (frightenedTimer.current < 120 && Math.floor(frameCount.current / 8) % 2 === 0) {
          color = '#ffffff'
        } else {
          color = '#2121de'
        }
      } else if (ghost.mode === 'eaten') {
        // Just draw eyes for eaten ghost
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(gx - 4, gy - 2, 4, 0, Math.PI * 2)
        ctx.arc(gx + 4, gy - 2, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#00f'
        ctx.beginPath()
        ctx.arc(gx - 4, gy - 1, 2, 0, Math.PI * 2)
        ctx.arc(gx + 4, gy - 1, 2, 0, Math.PI * 2)
        ctx.fill()
        return
      }

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(gx, gy - 2, gr, Math.PI, 0)
      ctx.lineTo(gx + gr, gy + gr - 2)

      // Wavy bottom
      for (let i = 0; i < 4; i++) {
        const wx = gx + gr - (i + 0.5) * (gr / 2)
        const wy = gy + gr - 2 + (i % 2 === 0 ? 3 : -1)
        ctx.lineTo(wx, wy)
      }
      ctx.lineTo(gx - gr, gy - 2)
      ctx.fill()

      // Eyes
      if (ghost.mode !== 'frightened') {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(gx - 4, gy - 3, 4, 0, Math.PI * 2)
        ctx.arc(gx + 4, gy - 3, 4, 0, Math.PI * 2)
        ctx.fill()

        // Pupils look toward movement direction
        let pupilOffsetX = 0, pupilOffsetY = 0
        switch (ghost.dir) {
          case 'LEFT': pupilOffsetX = -1; break
          case 'RIGHT': pupilOffsetX = 1; break
          case 'UP': pupilOffsetY = -1; break
          case 'DOWN': pupilOffsetY = 1; break
        }
        ctx.fillStyle = '#00f'
        ctx.beginPath()
        ctx.arc(gx - 4 + pupilOffsetX, gy - 2 + pupilOffsetY, 2, 0, Math.PI * 2)
        ctx.arc(gx + 4 + pupilOffsetX, gy - 2 + pupilOffsetY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === "initials") {
        e.preventDefault()
        if (e.key === "Backspace") {
          setPlayerInitials(prev => prev.slice(0, -1))
        } else if (e.key === "Enter" && playerInitials.length > 0) {
          handleInitialsSubmit()
        } else if (/^[a-zA-Z0-9]$/.test(e.key) && playerInitials.length < 3) {
          setPlayerInitials(prev => (prev + e.key).toUpperCase())
        }
        return
      }

      if (e.key === "Enter" || e.key === " ") {
        if (gameState === "menu") {
          e.preventDefault()
          startGame(false)
        } else if (gameState === "gameover") {
          e.preventDefault()
          startGame(false)
        } else if (gameState === "levelup") {
          e.preventDefault()
          startGame(true)
        }
        return
      }

      if (e.key === "Escape") {
        onExit()
        return
      }

      if (gameState === "playing") {
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            e.preventDefault()
            pacmanNextDir.current = "UP"
            break
          case "ArrowDown":
          case "s":
          case "S":
            e.preventDefault()
            pacmanNextDir.current = "DOWN"
            break
          case "ArrowLeft":
          case "a":
          case "A":
            e.preventDefault()
            pacmanNextDir.current = "LEFT"
            break
          case "ArrowRight":
          case "d":
          case "D":
            e.preventDefault()
            pacmanNextDir.current = "RIGHT"
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState, playerInitials, startGame, onExit, handleInitialsSubmit])

  // Touch steering: swipes mirror the arrow keys
  const swipeHandlers = useSwipe((dir) => {
    if (gameState === "playing") {
      pacmanNextDir.current = dir
    }
  })

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let lastTime = performance.now()

    const gameLoop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000 // Convert to seconds
      lastTime = time
      frameCount.current++

      // Animate mouth
      if (mouthOpening.current) {
        mouthAngle.current += deltaTime * 8
        if (mouthAngle.current >= 0.5) mouthOpening.current = false
      } else {
        mouthAngle.current -= deltaTime * 8
        if (mouthAngle.current <= 0.05) mouthOpening.current = true
      }

      // Update mode timer (scatter/chase switching)
      modeTimer.current += deltaTime
      const isChaseMode = modeTimer.current > 7 && Math.floor(modeTimer.current / 20) % 2 === 0

      // Update frightened timer
      if (frightenedTimer.current > 0) {
        frightenedTimer.current -= deltaTime * 60
        if (frightenedTimer.current <= 0) {
          frightenedTimer.current = 0
          ghostsRef.current.forEach(g => {
            if (g.mode === 'frightened') g.mode = isChaseMode ? 'chase' : 'scatter'
          })
          ghostsEaten.current = 0
        }
      }

      // Update ghost modes based on timer
      if (frightenedTimer.current <= 0) {
        ghostsRef.current.forEach(g => {
          if (g.mode !== 'eaten') {
            g.mode = isChaseMode ? 'chase' : 'scatter'
          }
        })
      }

      // Move Pac-Man
      const pacSpeed = PACMAN_SPEED * (1 + (level - 1) * 0.05)
      pacmanMoveTimer.current += deltaTime * pacSpeed

      while (pacmanMoveTimer.current >= 1) {
        pacmanMoveTimer.current -= 1

        // Try to turn
        if (pacmanNextDir.current !== 'NONE') {
          const nextPos = getNextPosition(pacmanPos.current, pacmanNextDir.current)
          if (canMove(mazeRef.current, nextPos.x, nextPos.y)) {
            pacmanDir.current = pacmanNextDir.current
          }
        }

        // Move in current direction
        if (pacmanDir.current !== 'NONE') {
          const movePos = getNextPosition(pacmanPos.current, pacmanDir.current)
          if (canMove(mazeRef.current, movePos.x, movePos.y)) {
            pacmanPos.current = movePos
          }
        }

        // Eat pellets
        const { x, y } = pacmanPos.current
        if (x >= 0 && x < MAZE_WIDTH && y >= 0 && y < MAZE_HEIGHT) {
          const cell = mazeRef.current[y][x]
          if (cell === 1) {
            mazeRef.current[y][x] = 3
            setScore(s => s + PELLET_SCORE)
            setPelletsRemaining(p => {
              const remaining = p - 1
              if (remaining <= 0) setGameState("levelup")
              return remaining
            })
          } else if (cell === 2) {
            mazeRef.current[y][x] = 3
            setScore(s => s + POWER_PELLET_SCORE)
            setPelletsRemaining(p => {
              const remaining = p - 1
              if (remaining <= 0) setGameState("levelup")
              return remaining
            })
            // Frighten ghosts
            frightenedTimer.current = FRIGHTENED_DURATION
            ghostsEaten.current = 0
            ghostsRef.current.forEach(g => {
              if (g.mode !== 'eaten') g.mode = 'frightened'
            })
          }
        }
      }

      // Move ghosts
      ghostsRef.current.forEach((ghost, idx) => {
        const baseSpeed = ghost.mode === 'frightened' ? GHOST_FRIGHTENED_SPEED :
                          ghost.mode === 'eaten' ? GHOST_SPEED * 1.5 : GHOST_SPEED
        const speed = baseSpeed * (1 + (level - 1) * 0.03)

        ghostMoveTimers.current[idx] += deltaTime * speed

        while (ghostMoveTimers.current[idx] >= 1) {
          ghostMoveTimers.current[idx] -= 1

          ghost.dir = getGhostDirection(ghost, mazeRef.current, pacmanPos.current, frameCount.current)

          if (ghost.dir !== 'NONE') {
            const nextGhostPos = getNextPosition(ghost.pos, ghost.dir)
            if (canMove(mazeRef.current, nextGhostPos.x, nextGhostPos.y)) {
              ghost.pos = nextGhostPos
            }
          }

          // Check if eaten ghost returned home
          if (ghost.mode === 'eaten' && ghost.pos.x === GHOST_START.x && ghost.pos.y === GHOST_START.y) {
            ghost.mode = isChaseMode ? 'chase' : 'scatter'
          }
        }

        // Check collision
        if (checkCollision(pacmanPos.current, ghost.pos)) {
          if (ghost.mode === 'frightened') {
            const scoreIdx = Math.min(ghostsEaten.current, GHOST_SCORE.length - 1)
            setScore(s => s + GHOST_SCORE[scoreIdx])
            ghostsEaten.current++
            ghost.mode = 'eaten'
          } else if (ghost.mode !== 'eaten') {
            handleDeath()
            return
          }
        }
      })

      // Render
      render(ctx, canvas)

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameState, level, handleDeath])


  // Canvas setup
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = MAZE_WIDTH * CELL_SIZE + 40
      canvasRef.current.height = MAZE_HEIGHT * CELL_SIZE + 40
    }
  }, [])

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent touch-none" {...swipeHandlers}>
      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 flex justify-between px-8 text-mono pointer-events-none z-10">
        <div className="flex flex-col items-start gap-1 text-yellow-400">
          <span className="text-xl font-bold">SCORE</span>
          <span className="text-4xl">{score.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-white/50">
          <span className="text-sm tracking-widest">LEVEL</span>
          <span className="text-2xl font-bold text-white">{level}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-red-400">
          <span className="text-xl font-bold">LIVES</span>
          <span className="text-2xl">{"●".repeat(lives)}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="border border-blue-900 bg-black rounded-lg shadow-2xl"
      />

      {/* Menu Overlay */}
      {gameState === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-8 p-12 border border-yellow-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(255,255,0,0.1)]">
            <h1 className="text-6xl font-black text-yellow-400 tracking-tighter">
              PAC-MAN
            </h1>
            <div className="flex flex-col gap-2 text-center text-slate-400 font-mono text-sm">
              <p>USE ARROW KEYS OR WASD TO MOVE</p>
              <p>EAT ALL PELLETS TO WIN</p>
              <p>POWER PELLETS LET YOU EAT GHOSTS</p>
            </div>
            <button
              onClick={() => startGame(false)}
              className="flex items-center gap-2 px-8 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" />
              START GAME
            </button>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-yellow-500/20">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-yellow-400 w-10">{hs.initials}</span>
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

      {/* Level Up Overlay */}
      {gameState === "levelup" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-emerald-500/30 rounded-xl bg-black/90">
            <h2 className="text-4xl font-bold text-emerald-400 tracking-widest">
              LEVEL COMPLETE!
            </h2>
            <p className="text-2xl text-white">Score: {score.toLocaleString()}</p>
            <button
              onClick={() => startGame(true)}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded transition-all"
            >
              NEXT LEVEL
            </button>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER] Continue</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}

      {/* Initials Input Overlay */}
      {gameState === "initials" && (
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
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-12 h-14 border-2 rounded flex items-center justify-center text-3xl font-bold ${
                      i < playerInitials.length
                        ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                        : i === playerInitials.length
                        ? 'border-white/50 text-white animate-pulse'
                        : 'border-slate-600 text-slate-600'
                    }`}
                  >
                    {playerInitials[i] || '_'}
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

      {/* Game Over Overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-red-500/30 rounded-xl bg-black/90">
            <h2 className="text-4xl font-bold text-red-400 tracking-widest">
              GAME OVER
            </h2>
            <p className="text-2xl text-white">Final Score: {score.toLocaleString()}</p>
            <p className="text-lg text-slate-400">Level: {level}</p>

            {/* High Scores */}
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
                      <span className="text-yellow-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                      <span className="text-slate-500">LVL {hs.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => startGame(false)}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                PLAY AGAIN
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
              <span>[ENTER] Play Again</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
