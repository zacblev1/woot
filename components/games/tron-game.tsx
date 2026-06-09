"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Monitor, RefreshCw, X, Trophy } from "lucide-react"
import { useHighScores } from "@/lib/hooks/useHighScores"

interface TronGameProps {
    onExit: () => void
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
type Point = { x: number; y: number }

const CELL_SIZE = 10
const INITIAL_SPEED = 20
const SPEED_INCREMENT = 5

export function TronGame({ onExit }: TronGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "initials">("menu")
    const [winner, setWinner] = useState<"player" | "cpu" | null>(null)
    const [score, setScore] = useState({ player: 0, cpu: 0 })
    const [level, setLevel] = useState(1)

    // High score state
    const { scores: highScores, isLoading: scoresLoading, submitScore, isHighScore } = useHighScores('tron')
    const [playerInitials, setPlayerInitials] = useState("")
    const [finalScore, setFinalScore] = useState(0)

    // Game state refs (mutable for performance in loop)
    const playerPos = useRef<Point>({ x: 10, y: 30 })
    const playerDir = useRef<Direction>("RIGHT")
    const playerNextDir = useRef<Direction>("RIGHT")
    const playerTrail = useRef<Point[]>([])

    const cpuPos = useRef<Point>({ x: 90, y: 30 })
    const cpuDir = useRef<Direction>("LEFT")
    const cpuTrail = useRef<Point[]>([])

    // Set-based trail tracking for O(1) collision detection
    const playerTrailSet = useRef<Set<string>>(new Set())
    const cpuTrailSet = useRef<Set<string>>(new Set())

    const gameLoopRef = useRef<number | undefined>(undefined)
    const gridWidth = useRef(100) // Cells
    const gridHeight = useRef(60) // Cells
    const speedRef = useRef(INITIAL_SPEED)

    const startGame = useCallback((nextLevel: boolean = false) => {
        if (!canvasRef.current) return

        const width = Math.floor(canvasRef.current.width / CELL_SIZE)
        const height = Math.floor(canvasRef.current.height / CELL_SIZE)

        gridWidth.current = width
        gridHeight.current = height

        // Reset positions
        playerPos.current = { x: Math.floor(width * 0.2), y: Math.floor(height / 2) }
        playerDir.current = "RIGHT"
        playerNextDir.current = "RIGHT"
        playerTrail.current = []

        cpuPos.current = { x: Math.floor(width * 0.8), y: Math.floor(height / 2) }
        cpuDir.current = "LEFT"
        cpuTrail.current = []

        // Clear trail Sets for O(1) collision detection
        playerTrailSet.current.clear()
        cpuTrailSet.current.clear()

        if (nextLevel) {
            setLevel(l => l + 1)
            speedRef.current += SPEED_INCREMENT
        } else {
            setLevel(1)
            setScore({ player: 0, cpu: 0 })
            speedRef.current = INITIAL_SPEED
        }

        setGameState("playing")
        setWinner(null)
    }, [])

    // Handle initials submission
    const handleInitialsSubmit = useCallback(async () => {
        if (playerInitials.length > 0) {
            await submitScore(playerInitials, finalScore, level)
            setPlayerInitials("")
            setGameState("gameover")
        }
    }, [playerInitials, finalScore, level, submitScore])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Handle initials input
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

            // Menu/Game Over: Enter or Space to start/restart
            if (e.key === "Enter" || e.key === " ") {
                if (gameState === "menu") {
                    e.preventDefault()
                    startGame(false)
                } else if (gameState === "gameover") {
                    e.preventDefault()
                    // If player won, advance to next level; otherwise restart
                    startGame(winner === "player")
                }
                return
            }

            // Escape to exit
            if (e.key === "Escape") {
                onExit()
                return
            }

            // Arrow keys and WASD for movement (only during gameplay)
            if (gameState === "playing") {
                switch (e.key) {
                    case "ArrowUp":
                    case "w":
                    case "W":
                        if (playerDir.current !== "DOWN") playerNextDir.current = "UP"
                        break
                    case "ArrowDown":
                    case "s":
                    case "S":
                        if (playerDir.current !== "UP") playerNextDir.current = "DOWN"
                        break
                    case "ArrowLeft":
                    case "a":
                    case "A":
                        if (playerDir.current !== "RIGHT") playerNextDir.current = "LEFT"
                        break
                    case "ArrowRight":
                    case "d":
                    case "D":
                        if (playerDir.current !== "LEFT") playerNextDir.current = "RIGHT"
                        break
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [gameState, winner, playerInitials, startGame, onExit, handleInitialsSubmit])

    // AI Logic - Flood Fill Heuristic
    const countReachable = (startPos: Point, trails: Set<string>, w: number, h: number, maxDepth: number = 50): number => {
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
                { x: curr.x, y: curr.y - 1 }
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

    // Minimax with Alpha-Beta Pruning
    const minimax = (
        depth: number,
        isMaximizing: boolean,
        cpuPosition: Point,
        playerPosition: Point,
        obstacles: Set<string>,
        w: number,
        h: number,
        alpha: number,
        beta: number
    ): number => {
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

        const moves: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"]

        if (isMaximizing) {
            // CPU's turn - maximize
            let maxEval = -Infinity
            let hasValidMove = false

            for (const move of moves) {
                let nextX = cpuPosition.x
                let nextY = cpuPosition.y
                if (move === "UP") nextY--
                if (move === "DOWN") nextY++
                if (move === "LEFT") nextX--
                if (move === "RIGHT") nextX++

                const nextKey = `${nextX},${nextY}`

                // Check if move is valid
                if (nextX < 0 || nextX >= w || nextY < 0 || nextY >= h) continue
                if (obstacles.has(nextKey)) continue
                // Can't move into player's current position
                if (nextX === playerPosition.x && nextY === playerPosition.y) continue

                hasValidMove = true
                const nextPos = { x: nextX, y: nextY }

                // Add current CPU position to obstacles (trail left behind)
                const currentKey = `${cpuPosition.x},${cpuPosition.y}`
                obstacles.add(currentKey)

                const evalScore = minimax(depth - 1, false, nextPos, playerPosition, obstacles, w, h, alpha, beta)

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
                let nextX = playerPosition.x
                let nextY = playerPosition.y
                if (move === "UP") nextY--
                if (move === "DOWN") nextY++
                if (move === "LEFT") nextX--
                if (move === "RIGHT") nextX++

                const nextKey = `${nextX},${nextY}`

                // Check if move is valid
                if (nextX < 0 || nextX >= w || nextY < 0 || nextY >= h) continue
                if (obstacles.has(nextKey)) continue
                // Can't move into CPU's current position
                if (nextX === cpuPosition.x && nextY === cpuPosition.y) continue

                hasValidMove = true
                const nextPos = { x: nextX, y: nextY }

                // Add current player position to obstacles (trail left behind)
                const currentKey = `${playerPosition.x},${playerPosition.y}`
                obstacles.add(currentKey)

                const evalScore = minimax(depth - 1, true, cpuPosition, nextPos, obstacles, w, h, alpha, beta)

                obstacles.delete(currentKey)

                minEval = Math.min(minEval, evalScore)
                beta = Math.min(beta, evalScore)
                if (beta <= alpha) break // Prune
            }

            // No valid moves = player is trapped and CPU wins
            return hasValidMove ? minEval : 1000
        }
    }

    const updateCpu = () => {
        const w = gridWidth.current
        const h = gridHeight.current

        // Create a Set of all trail obstacles (NOT current positions)
        const obstacles = new Set<string>()
        playerTrail.current.forEach(p => obstacles.add(`${p.x},${p.y}`))
        cpuTrail.current.forEach(p => obstacles.add(`${p.x},${p.y}`))

        const moves: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"]

        // 1. Identify valid moves
        const validMoves = moves.filter(move => {
            let nextX = cpuPos.current.x
            let nextY = cpuPos.current.y
            if (move === "UP") nextY--
            if (move === "DOWN") nextY++
            if (move === "LEFT") nextX--
            if (move === "RIGHT") nextX++

            // Bounds
            if (nextX < 0 || nextX >= w || nextY < 0 || nextY >= h) return false
            // Obstacles (trails)
            if (obstacles.has(`${nextX},${nextY}`)) return false
            // Can't move into player's current position
            if (nextX === playerPos.current.x && nextY === playerPos.current.y) return false

            return true
        })

        if (validMoves.length === 0) return // Dead

        // 2. Choose best move using Minimax with Alpha-Beta Pruning
        let bestMove = validMoves[0]
        let maxVal = -Infinity

        // Depth 5 gives better lookahead while staying performant
        const DEPTH = 5

        // Prioritize current direction to reduce wiggling, then other moves
        const currentDir = cpuDir.current
        const orderedMoves = [
            ...validMoves.filter(m => m === currentDir),
            ...validMoves.filter(m => m !== currentDir).sort(() => Math.random() - 0.5)
        ]

        for (const move of orderedMoves) {
            let nextX = cpuPos.current.x
            let nextY = cpuPos.current.y
            if (move === "UP") nextY--
            if (move === "DOWN") nextY++
            if (move === "LEFT") nextX--
            if (move === "RIGHT") nextX++

            // Add CPU's current position to obstacles (trail left behind when moving)
            const trailKey = `${cpuPos.current.x},${cpuPos.current.y}`
            obstacles.add(trailKey)

            // Evaluate this move - player responds trying to minimize CPU's score
            let val = minimax(DEPTH, false, { x: nextX, y: nextY }, playerPos.current, obstacles, w, h, -Infinity, Infinity)

            // Small bonus for continuing in same direction (reduces wiggling)
            if (move === currentDir) {
                val += 0.5
            }

            obstacles.delete(trailKey)

            if (val > maxVal) {
                maxVal = val
                bestMove = move
            }
        }

        cpuDir.current = bestMove
    }

    // Mirror frequently-changing values into refs so the game loop reads the
    // latest without restarting the RAF loop mid-game.
    const levelRef = useRef(level)
    const isHighScoreRef = useRef(isHighScore)
    const updateCpuRef = useRef(updateCpu)
    useEffect(() => {
        levelRef.current = level
        isHighScoreRef.current = isHighScore
        updateCpuRef.current = updateCpu
    })

    useEffect(() => {
        if (gameState !== "playing") {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
            return
        }

        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        let lastTime = 0
        let accumulatedTime = 0

        const gameLoop = (time: number) => {
            const step = 1000 / speedRef.current
            const deltaTime = time - lastTime
            lastTime = time
            accumulatedTime += Math.min(deltaTime, 100)

            while (accumulatedTime >= step) {
                accumulatedTime -= step

                // Update directions
                playerDir.current = playerNextDir.current
                updateCpuRef.current()

                // Move Player
                playerTrail.current.push({ ...playerPos.current })
                playerTrailSet.current.add(`${playerPos.current.x},${playerPos.current.y}`)
                if (playerDir.current === "UP") playerPos.current.y--
                if (playerDir.current === "DOWN") playerPos.current.y++
                if (playerDir.current === "LEFT") playerPos.current.x--
                if (playerDir.current === "RIGHT") playerPos.current.x++

                // Move CPU
                cpuTrail.current.push({ ...cpuPos.current })
                cpuTrailSet.current.add(`${cpuPos.current.x},${cpuPos.current.y}`)
                if (cpuDir.current === "UP") cpuPos.current.y--
                if (cpuDir.current === "DOWN") cpuPos.current.y++
                if (cpuDir.current === "LEFT") cpuPos.current.x--
                if (cpuDir.current === "RIGHT") cpuPos.current.x++

                // Check Collisions
                // 1. Wall Collisions
                let playerCrash =
                    playerPos.current.x < 0 || playerPos.current.x >= gridWidth.current ||
                    playerPos.current.y < 0 || playerPos.current.y >= gridHeight.current

                let cpuCrash =
                    cpuPos.current.x < 0 || cpuPos.current.x >= gridWidth.current ||
                    cpuPos.current.y < 0 || cpuPos.current.y >= gridHeight.current

                // 2. Trail Collisions (O(1) with Set.has())
                const playerKey = `${playerPos.current.x},${playerPos.current.y}`
                const cpuKey = `${cpuPos.current.x},${cpuPos.current.y}`

                // Self collision
                if (playerTrailSet.current.has(playerKey)) playerCrash = true
                if (cpuTrailSet.current.has(cpuKey)) cpuCrash = true

                // Cross collision
                if (cpuTrailSet.current.has(playerKey)) playerCrash = true
                if (playerTrailSet.current.has(cpuKey)) cpuCrash = true

                // Head to Head
                if (playerPos.current.x === cpuPos.current.x && playerPos.current.y === cpuPos.current.y) {
                    playerCrash = true
                    cpuCrash = true
                }

                if (playerCrash || cpuCrash) {
                    if (playerCrash && cpuCrash) {
                        setWinner(null) // Tie
                        setGameState("gameover")
                    } else if (playerCrash) {
                        setWinner("cpu")
                        setScore(s => {
                            // Calculate final score: (wins * 100) + (level * 500)
                            const newFinalScore = (s.player * 100) + (levelRef.current * 500)
                            setFinalScore(newFinalScore)
                            // Check if qualifies for high score
                            if (isHighScoreRef.current(newFinalScore) && newFinalScore > 0) {
                                setGameState("initials")
                            } else {
                                setGameState("gameover")
                            }
                            return { ...s, cpu: s.cpu + 1 }
                        })
                    } else {
                        setWinner("player")
                        setScore(s => ({ ...s, player: s.player + 1 }))
                        setGameState("gameover")
                    }
                    return // Stop loop
                }
            }

            // Render
            ctx.fillStyle = "#000" // Background
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Player Trail
            ctx.fillStyle = "#0ff" // Cyan
            ctx.shadowBlur = 10
            ctx.shadowColor = "#0ff"
            for (const p of playerTrail.current) {
                ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
            }
            // Draw Player Head
            ctx.fillStyle = "#fff"
            ctx.fillRect(playerPos.current.x * CELL_SIZE, playerPos.current.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

            // Draw CPU Trail
            ctx.fillStyle = "#f0f" // Magenta
            ctx.shadowColor = "#f0f"
            for (const p of cpuTrail.current) {
                ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
            }
            // Draw CPU Head
            ctx.fillStyle = "#fff"
            ctx.fillRect(cpuPos.current.x * CELL_SIZE, cpuPos.current.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

            // Borders
            ctx.strokeStyle = "#444"
            ctx.shadowBlur = 0
            ctx.strokeRect(0, 0, canvas.width, canvas.height)

            gameLoopRef.current = requestAnimationFrame(gameLoop)
        }

        gameLoopRef.current = requestAnimationFrame(gameLoop)

        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
        }
    }, [gameState])

    // Canvas Resize Handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement
                if (parent) {
                    // Snap to nearest cell size
                    const w = Math.floor(parent.clientWidth / CELL_SIZE) * CELL_SIZE
                    const h = Math.floor(parent.clientHeight / CELL_SIZE) * CELL_SIZE
                    canvasRef.current.width = w
                    canvasRef.current.height = h
                    gridWidth.current = w / CELL_SIZE
                    gridHeight.current = h / CELL_SIZE
                }
            }
        }

        // Initial resize
        handleResize()

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [gameState])

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent">
            {/* HUD */}
            <div className="absolute top-4 left-0 right-0 flex justify-between px-8 text-mono pointer-events-none z-10">
                <div className="flex flex-col items-start gap-1 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">
                    <span className="text-xl font-bold">PLAYER 1</span>
                    <span className="text-4xl">{score.player}</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-white/50">
                    <span className="text-sm tracking-widest">LEVEL</span>
                    <span className="text-2xl font-bold text-white">{level}</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
                    <span className="text-xl font-bold">CPU</span>
                    <span className="text-4xl">{score.cpu}</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                className="border border-slate-700 bg-black/50 rounded-lg shadow-2xl"
            />

            {/* Main Menu Overlay */}
            {gameState === "menu" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-8 p-12 border border-cyan-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 tracking-tighter drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                            TRON
                        </h1>
                        <div className="flex flex-col gap-2 text-center text-slate-400 font-mono text-sm">
                            <p>USE ARROW KEYS OR WASD TO MOVE</p>
                            <p>AVOID WALLS AND TRAILS</p>
                        </div>
                        <button
                            onClick={() => startGame(false)}
                            className="flex items-center gap-2 px-8 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded transition-all hover:scale-105 active:scale-95"
                        >
                            <Monitor className="w-5 h-5" />
                            START GAME
                        </button>

                        {/* High Scores */}
                        {!scoresLoading && highScores.length > 0 && (
                            <div className="flex flex-col items-center gap-2 pt-4 border-t border-cyan-500/20">
                                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                                    <Trophy className="w-4 h-4" />
                                    HIGH SCORES
                                </div>
                                <div className="flex flex-col gap-1 font-mono text-xs">
                                    {highScores.slice(0, 5).map((hs, i) => (
                                        <div key={hs.id} className="flex gap-4 text-slate-400">
                                            <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                                            <span className="text-cyan-400 w-10">{hs.initials}</span>
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
                                                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
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
                    <div className="flex flex-col items-center gap-6 p-8 border border-white/10 rounded-xl bg-black/90">
                        <h2 className="text-4xl font-bold text-white tracking-widest">
                            {winner === "player" ? <span className="text-cyan-400">VICTORY</span> : winner === "cpu" ? <span className="text-fuchsia-400">DEREEZED</span> : "DRAW"}
                        </h2>

                        {/* High Scores */}
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
                                            <span className="text-cyan-400 w-10">{hs.initials}</span>
                                            <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                                            <span className="text-slate-500">LVL {hs.level}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {winner === "player" ? (
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-emerald-400 font-mono animate-pulse">LEVEL COMPLETED</p>
                                <p className="text-white/50 text-sm">Speed increased!</p>
                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => startGame(true)}
                                        className="flex items-center gap-2 px-8 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded transition-all"
                                    >
                                        <span className="font-bold">NEXT LEVEL</span>
                                    </button>
                                    <button
                                        onClick={onExit}
                                        className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded transition-colors"
                                    >
                                        EXIT
                                    </button>
                                </div>
                                <div className="flex gap-4 text-slate-600 text-xs font-mono mt-2">
                                    <span>[ENTER] Next Level</span>
                                    <span>[ESC] Exit</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => startGame(false)}
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
                        )}
                    </div>
                </div>
            )
            }
        </div >
    )
}
