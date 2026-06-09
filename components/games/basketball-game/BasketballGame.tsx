"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Play, RefreshCw, X } from "lucide-react"
import {
  Point,
  BALL_RADIUS,
  RIM_INNER_WIDTH,
  RIM_Y,
  RIM_THICKNESS,
  NET_DEPTH,
  AIR_RESISTANCE,
  GRAVITY,
  checkRimCollision,
  checkBackboardCollision,
  checkScore,
  calculateTrajectory
} from './physics'

interface BasketballGameProps {
  onExit: () => void
}

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 450
const GAME_DURATION = 60

// Power and aiming
const POWER_MULTIPLIER = 8
const MAX_POWER = 100
const CHARGE_SPEED = 100
const AIM_SPEED = 80

// Hoop position - right side of screen like real arcade
const HOOP_CENTER_X = CANVAS_WIDTH - 120
const RIM_LEFT_X = HOOP_CENTER_X - RIM_INNER_WIDTH / 2
const RIM_RIGHT_X = HOOP_CENTER_X + RIM_INNER_WIDTH / 2

// Backboard
const BACKBOARD_X = RIM_RIGHT_X + 15
const BACKBOARD_TOP = RIM_Y - 60
const BACKBOARD_BOTTOM = RIM_Y + 30

// Ball starting position - left side
const BALL_START_X = 80
const BALL_START_Y = CANVAS_HEIGHT - 60

// Aim constraints
const MIN_ANGLE = 20
const MAX_ANGLE = 80
const DEFAULT_ANGLE = 55

export function BasketballGame({ onExit }: BasketballGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastShotResult, setLastShotResult] = useState<string | null>(null)

  // Game state refs
  const ballPos = useRef<Point>({ x: BALL_START_X, y: BALL_START_Y })
  const prevBallPos = useRef<Point>({ x: BALL_START_X, y: BALL_START_Y })
  const ballVelocity = useRef<Point>({ x: 0, y: 0 })
  const ballInFlight = useRef(false)
  const hasScored = useRef(false)
  const hitRim = useRef(false)
  const gameLoopRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Aiming and power
  const aimAngle = useRef(DEFAULT_ANGLE)
  const power = useRef(0)
  const isCharging = useRef(false)
  const keysPressed = useRef<Set<string>>(new Set())

  // Ball trail
  const ballTrail = useRef<Point[]>([])

  const resetBall = useCallback(() => {
    ballPos.current = { x: BALL_START_X, y: BALL_START_Y }
    prevBallPos.current = { x: BALL_START_X, y: BALL_START_Y }
    ballVelocity.current = { x: 0, y: 0 }
    ballInFlight.current = false
    hasScored.current = false
    hitRim.current = false
    ballTrail.current = []
    power.current = 0
    isCharging.current = false
  }, [])

  const shootBall = useCallback(() => {
    if (ballInFlight.current || power.current < 15) return

    const angleRad = (aimAngle.current * Math.PI) / 180
    const launchPower = power.current * POWER_MULTIPLIER

    ballVelocity.current = {
      x: Math.cos(angleRad) * launchPower,
      y: -Math.sin(angleRad) * launchPower
    }

    ballInFlight.current = true
    hasScored.current = false
    hitRim.current = false
    power.current = 0
    isCharging.current = false
    setLastShotResult(null)
  }, [])

  const handleScore = useCallback((isSwish: boolean) => {
    if (hasScored.current) return
    hasScored.current = true

    setStreak(s => {
      const newStreak = s + 1
      setBestStreak(best => Math.max(best, newStreak))

      let points = 2
      if (newStreak >= 5) points = 5
      else if (newStreak >= 3) points = 3

      if (isSwish) {
        points *= 2
        setLastShotResult(`SWISH! +${points}`)
      } else {
        setLastShotResult(`+${points}`)
      }

      setScore(prev => prev + points)
      return newStreak
    })
  }, [])

  const handleMiss = useCallback(() => {
    setStreak(0)
    setLastShotResult("MISS")
  }, [])

  const startGame = useCallback(() => {
    setScore(0)
    setTimeLeft(GAME_DURATION)
    setStreak(0)
    setBestStreak(0)
    setLastShotResult(null)
    aimAngle.current = DEFAULT_ANGLE
    resetBall()
    setGameState("playing")
  }, [resetBall])

  const endGame = useCallback(() => {
    setGameState("gameover")
  }, [])

  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Background
    ctx.fillStyle = "#0a0a12"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Court floor line
    ctx.strokeStyle = "rgba(255, 150, 50, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_HEIGHT - 20)
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 20)
    ctx.stroke()

    // Check if ball is passing through the hoop (for render order)
    const ballInHoop = ballPos.current.x > RIM_LEFT_X &&
                       ballPos.current.x < RIM_RIGHT_X &&
                       ballPos.current.y > RIM_Y - BALL_RADIUS &&
                       ballPos.current.y < RIM_Y + NET_DEPTH + BALL_RADIUS

    // Backboard (vertical, white/cyan) - always behind
    ctx.shadowBlur = 10
    ctx.shadowColor = "#00ffff"
    ctx.fillStyle = "rgba(200, 255, 255, 0.9)"
    ctx.fillRect(BACKBOARD_X, BACKBOARD_TOP, 8, BACKBOARD_BOTTOM - BACKBOARD_TOP)
    ctx.shadowBlur = 0
    ctx.strokeStyle = "#00ffff"
    ctx.lineWidth = 2
    ctx.strokeRect(BACKBOARD_X, BACKBOARD_TOP, 8, BACKBOARD_BOTTOM - BACKBOARD_TOP)

    // Rim connector to backboard - always behind
    ctx.shadowBlur = 15
    ctx.shadowColor = "#ff6600"
    ctx.strokeStyle = "#ff6600"
    ctx.lineWidth = RIM_THICKNESS
    ctx.beginPath()
    ctx.moveTo(RIM_RIGHT_X, RIM_Y)
    ctx.lineTo(BACKBOARD_X, RIM_Y)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Helper function to draw ball
    const drawBall = () => {
      // Ball trail
      if (ballInFlight.current) {
        ballTrail.current.forEach((point, i) => {
          const alpha = (i / ballTrail.current.length) * 0.4
          const size = (i / ballTrail.current.length) * BALL_RADIUS * 0.7
          ctx.fillStyle = `rgba(255, 120, 0, ${alpha})`
          ctx.beginPath()
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
          ctx.fill()
        })
      }

      // Ball
      ctx.shadowBlur = 12
      ctx.shadowColor = "#ff6600"

      const ballGradient = ctx.createRadialGradient(
        ballPos.current.x - 4, ballPos.current.y - 4, 0,
        ballPos.current.x, ballPos.current.y, BALL_RADIUS
      )
      ballGradient.addColorStop(0, "#ff9944")
      ballGradient.addColorStop(1, "#cc4400")
      ctx.fillStyle = ballGradient
      ctx.beginPath()
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      // Ball lines
      ctx.shadowBlur = 0
      ctx.strokeStyle = "#442200"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ballPos.current.x - BALL_RADIUS, ballPos.current.y)
      ctx.lineTo(ballPos.current.x + BALL_RADIUS, ballPos.current.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_RADIUS * 0.65, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
    }

    // Helper function to draw rim and net
    const drawRimAndNet = () => {
      // Net (hanging lines)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
      ctx.lineWidth = 1.5
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        const topX = RIM_LEFT_X + t * RIM_INNER_WIDTH
        const bottomX = HOOP_CENTER_X + (topX - HOOP_CENTER_X) * 0.3
        ctx.beginPath()
        ctx.moveTo(topX, RIM_Y + 3)
        ctx.quadraticCurveTo(topX, RIM_Y + NET_DEPTH * 0.5, bottomX, RIM_Y + NET_DEPTH)
        ctx.stroke()
      }
      // Horizontal net lines
      for (let j = 1; j <= 3; j++) {
        const y = RIM_Y + 5 + (NET_DEPTH - 5) * (j / 4)
        const shrink = j / 4 * 0.3
        ctx.beginPath()
        ctx.moveTo(RIM_LEFT_X + RIM_INNER_WIDTH * shrink, y)
        ctx.lineTo(RIM_RIGHT_X - RIM_INNER_WIDTH * shrink, y)
        ctx.stroke()
      }

      // Rim (orange ring)
      ctx.shadowBlur = 15
      ctx.shadowColor = "#ff6600"
      ctx.strokeStyle = "#ff6600"
      ctx.lineWidth = RIM_THICKNESS
      ctx.beginPath()
      ctx.moveTo(RIM_LEFT_X, RIM_Y)
      ctx.lineTo(RIM_RIGHT_X, RIM_Y)
      ctx.stroke()

      // Rim ends (circles)
      ctx.fillStyle = "#ff6600"
      ctx.beginPath()
      ctx.arc(RIM_LEFT_X, RIM_Y, RIM_THICKNESS / 2 + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(RIM_RIGHT_X, RIM_Y, RIM_THICKNESS / 2 + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Draw in correct order based on ball position
    if (ballInHoop) {
      // Ball is passing through - draw ball first, then rim/net on top
      drawBall()
      drawRimAndNet()
    } else {
      // Ball is not in hoop - draw rim/net first, then ball on top
      drawRimAndNet()
      drawBall()
    }

    // Trajectory preview
    if (!ballInFlight.current && (isCharging.current || power.current > 0)) {
      const angleRad = (aimAngle.current * Math.PI) / 180
      const previewPower = Math.max(power.current, 20) * POWER_MULTIPLIER
      const velocity = {
        x: Math.cos(angleRad) * previewPower,
        y: -Math.sin(angleRad) * previewPower
      }

      const trajectory = calculateTrajectory(ballPos.current, velocity, 50, 0.02)

      ctx.fillStyle = "rgba(255, 100, 255, 0.5)"
      trajectory.forEach((point, i) => {
        const alpha = (1 - i / trajectory.length) * 0.7
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    // Aim arrow
    if (!ballInFlight.current) {
      const angleRad = (aimAngle.current * Math.PI) / 180
      const arrowLen = 40 + (power.current / MAX_POWER) * 30

      ctx.strokeStyle = isCharging.current ? "#ff00ff" : "#ffffff"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(ballPos.current.x, ballPos.current.y)
      ctx.lineTo(
        ballPos.current.x + Math.cos(angleRad) * arrowLen,
        ballPos.current.y - Math.sin(angleRad) * arrowLen
      )
      ctx.stroke()

      // Power meter (arc around ball)
      const meterRadius = BALL_RADIUS + 10
      const meterAngle = (power.current / MAX_POWER) * Math.PI

      ctx.strokeStyle = "rgba(255,255,255,0.3)"
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(ballPos.current.x, ballPos.current.y, meterRadius, -Math.PI, 0)
      ctx.stroke()

      if (power.current > 0) {
        const gradient = ctx.createLinearGradient(
          ballPos.current.x - meterRadius, ballPos.current.y,
          ballPos.current.x + meterRadius, ballPos.current.y
        )
        gradient.addColorStop(0, "#00ff00")
        gradient.addColorStop(0.5, "#ffff00")
        gradient.addColorStop(1, "#ff0000")
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.arc(ballPos.current.x, ballPos.current.y, meterRadius, -Math.PI, -Math.PI + meterAngle)
        ctx.stroke()
      }
    }

    // Shot result text
    if (lastShotResult) {
      ctx.font = "bold 24px monospace"
      ctx.textAlign = "center"
      ctx.fillStyle = lastShotResult.includes("SWISH") ? "#00ffff" :
                      lastShotResult.includes("+") ? "#00ff00" : "#ff4444"
      ctx.fillText(lastShotResult, CANVAS_WIDTH / 2, 80)
    }

    // Instructions
    if (!ballInFlight.current && !isCharging.current) {
      ctx.font = "12px monospace"
      ctx.textAlign = "center"
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.fillText("UP/DOWN: Aim | HOLD SPACE: Power | RELEASE: Shoot", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 5)
    }
  }

  // Timer
  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState, endGame])

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === "menu" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          startGame()
        }
        if (e.key === "Escape") onExit()
        return
      }

      if (gameState === "playing") {
        if (e.key === "Escape") {
          onExit()
          return
        }

        keysPressed.current.add(e.key)

        if (e.key === " " && !ballInFlight.current && !isCharging.current) {
          e.preventDefault()
          isCharging.current = true
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key)

      if (gameState === "playing" && e.key === " " && isCharging.current) {
        e.preventDefault()
        shootBall()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameState, startGame, onExit, shootBall])

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    lastTimeRef.current = performance.now()

    const gameLoop = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      // Aiming
      if (!ballInFlight.current) {
        if (keysPressed.current.has("ArrowUp")) {
          aimAngle.current = Math.min(MAX_ANGLE, aimAngle.current + AIM_SPEED * deltaTime)
        }
        if (keysPressed.current.has("ArrowDown")) {
          aimAngle.current = Math.max(MIN_ANGLE, aimAngle.current - AIM_SPEED * deltaTime)
        }
        if (isCharging.current) {
          power.current = Math.min(MAX_POWER, power.current + CHARGE_SPEED * deltaTime)
        }
      }

      // Physics
      if (ballInFlight.current) {
        prevBallPos.current = { ...ballPos.current }

        // Apply gravity and air resistance
        ballVelocity.current = {
          x: ballVelocity.current.x * AIR_RESISTANCE,
          y: ballVelocity.current.y + GRAVITY * deltaTime
        }

        ballPos.current = {
          x: ballPos.current.x + ballVelocity.current.x * deltaTime,
          y: ballPos.current.y + ballVelocity.current.y * deltaTime
        }

        // Trail
        ballTrail.current.push({ ...ballPos.current })
        if (ballTrail.current.length > 12) ballTrail.current.shift()

        // Check scoring FIRST (before collisions can interfere)
        if (!hasScored.current && checkScore(ballPos.current, prevBallPos.current, RIM_LEFT_X, RIM_RIGHT_X)) {
          handleScore(!hitRim.current)
        }

        // Rim collision
        const rimCollision = checkRimCollision(
          ballPos.current,
          ballVelocity.current,
          RIM_LEFT_X,
          RIM_RIGHT_X
        )
        if (rimCollision.collided && rimCollision.newVelocity) {
          ballVelocity.current = rimCollision.newVelocity
          hitRim.current = true
        }

        // Backboard collision
        const backboardCollision = checkBackboardCollision(
          ballPos.current,
          ballVelocity.current,
          BACKBOARD_X,
          BACKBOARD_TOP,
          BACKBOARD_BOTTOM
        )
        if (backboardCollision.collided && backboardCollision.newVelocity) {
          ballVelocity.current = backboardCollision.newVelocity
          // Push ball out of backboard to prevent sticking
          if (backboardCollision.newPosition) {
            ballPos.current = backboardCollision.newPosition
          }
          hitRim.current = true
        }

        // Reset if off screen
        if (
          ballPos.current.y > CANVAS_HEIGHT + 50 ||
          ballPos.current.x < -50 ||
          ballPos.current.x > CANVAS_WIDTH + 50
        ) {
          if (!hasScored.current) handleMiss()
          resetBall()
        }
      }

      render(ctx, canvas)
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameState, handleScore, handleMiss, resetBall])


  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_WIDTH
      canvasRef.current.height = CANVAS_HEIGHT
    }
  }, [])

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent">
      {gameState === "playing" && (
        <div className="absolute top-4 left-0 right-0 flex justify-between px-8 text-mono pointer-events-none z-10">
          <div className="flex flex-col items-start gap-1 text-orange-400">
            <span className="text-xl font-bold">SCORE</span>
            <span className="text-4xl">{score}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm tracking-widest text-white/50">TIME</span>
            <span className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {timeLeft}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 text-cyan-400">
            <span className="text-xl font-bold">STREAK</span>
            <span className="text-2xl">{streak > 0 ? `${streak}x` : '-'}</span>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="border border-orange-900/50 bg-black rounded-lg shadow-2xl"
      />

      {gameState === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-8 p-12 border border-orange-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(255,102,0,0.1)]">
            <h1 className="text-5xl font-black text-orange-400 tracking-tighter">
              ARCADE HOOPS
            </h1>
            <div className="flex flex-col gap-2 text-center text-slate-400 font-mono text-sm">
              <p>UP/DOWN ARROWS TO AIM</p>
              <p>HOLD SPACE TO CHARGE</p>
              <p>RELEASE TO SHOOT</p>
              <p className="mt-2 text-cyan-400">SWISH = 2x | STREAKS = BONUS</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" />
              START GAME
            </button>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER/SPACE] Start</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-red-500/30 rounded-xl bg-black/90">
            <h2 className="text-4xl font-bold text-red-400 tracking-widest">
              TIME&apos;S UP!
            </h2>
            <p className="text-2xl text-white">Final Score: {score}</p>
            <p className="text-lg text-cyan-400">Best Streak: {bestStreak}x</p>

            <div className="flex gap-4">
              <button
                onClick={startGame}
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
              <span>[ENTER/SPACE] Play Again</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
