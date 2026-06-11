"use client"

import type React from "react"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"
import notesData from "@/data/notes.json"
import { VirtualFileSystem } from "@/lib/vfs"
import dynamic from "next/dynamic"
import { useState, useRef, useEffect } from "react"
import type { TerminalLine } from "@/lib/types/terminal"
import { themes, fonts, HIDDEN_THEMES, type ThemeName, type FontName } from "@/lib/terminal-config"
import { HistoryDisplay, InputLine, type InputLineHandle, VALID_COMMANDS, MobileKeyBar } from "./terminal/index"
import { useTerminalContext } from '@/lib/terminal-context'
import { createDefaultRegistry, executeCommand, type ExecuteContext } from '@/lib/commands'
import type { CommandOutput } from '@/lib/types/terminal'
import { useSound } from '@/lib/hooks/useSound'
import { dailyWord, localDateString, emojiGrid, updateStreak, type StreakRecord } from '@/components/games/wordle-game/daily'
import { pickSentences, wpm, accuracy, submittedScore, type RoundResult } from '@/components/games/typespeed-game'
import { useIdleTimer } from '@/lib/hooks/useIdleTimer'
import { Screensaver } from '@/components/screensaver'
import { CommandPalette } from '@/components/command-palette'

const TronGame = dynamic(() => import("@/components/games/tron-game").then(mod => mod.TronGame), {
  loading: () => <div className="p-4 text-green-500 font-mono">Loading Tron...</div>
})

const PacmanGame = dynamic(() => import("@/components/games/pacman-game").then(mod => mod.PacmanGame), {
  loading: () => <div className="p-4 text-yellow-400 font-mono">Loading Pac-Man...</div>
})

const BasketballGame = dynamic(() => import("@/components/games/basketball-game").then(mod => mod.BasketballGame), {
  loading: () => <div className="p-4 text-orange-400 font-mono">Loading Arcade Hoops...</div>
})

const SnakeGame = dynamic(() => import("@/components/games/snake-game").then(mod => mod.SnakeGame), {
  loading: () => <div className="p-4 text-green-400 font-mono">Loading Snake...</div>
})

interface GameState {
  active: boolean
  type: "number" | "wordle" | "trivia" | "blackjack" | "rps" | "tron" | "pacman" | "basketball" | "typespeed" | "snake" | "suggest" | null
  data?: Record<string, unknown>
}


const initialHistory: TerminalLine[] = [
  { type: "banner", content: " ███████╗ █████╗  ██████╗██╗  ██╗ █████╗ ██████╗ ██╗   ██╗", centered: true },
  { type: "banner", content: " ╚══███╔╝██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝", centered: true },
  { type: "banner", content: "   ███╔╝ ███████║██║     ███████║███████║██████╔╝ ╚████╔╝", centered: true },
  { type: "banner", content: "  ███╔╝  ██╔══██║██║     ██╔══██║██╔══██║██╔══██╗  ╚██╔╝", centered: true },
  { type: "banner", content: " ███████╗██║  ██║╚██████╗██║  ██║██║  ██║██║  ██║   ██║", centered: true },
  { type: "banner", content: " ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝", centered: true },
  { type: "output", content: "developer  ·  collector  ·  gamer", centered: true },
  { type: "output", content: "" },
  { type: "output", content: "Type 'help' for available commands or Ctrl+K to search.", centered: true },
  { type: "output", content: "Type 'tour' for a guided demo.", centered: true },
  { type: "output", content: "" },
]

// Command registry: single shared instance; commands are pure and receive all
// state through the ExecuteContext built per invocation.
const commandRegistry = createDefaultRegistry()

// `sl`: the classic punishment for mistyping `ls`
const TRAIN_FRAME = [
  '      ====        ________                ___________',
  '  _D _|  |_______/        \\__I_I_____===__|_________|',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|  ',
  '   /     |  |   H  |  |     |   |         ||_| |_||  ',
  '  |      |  |   H  |__--------------------| [___] |  ',
  '  | ________|___H__/__|_____/[][]~\\_______|       |  ',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__',
  '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
  ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
  '  \\_/      \\O=====O=====O=====O_/      \\_/            ',
]

const MELTDOWN_LINES: TerminalLine[] = [
  { type: 'error', content: 'rm: removing /home ...' },
  { type: 'error', content: 'rm: removing /usr ...' },
  { type: 'error', content: 'rm: removing /bin ...' },
  { type: 'error', content: 'rm: removing /boot ... wait' },
  { type: 'error', content: 'rm: cannot remove /dev/regret: device busy' },
  { type: 'error', content: 'segmentation fault (core dumped)' },
  { type: 'error', content: '*** KERNEL PANIC — not syncing: VFS deleted while in use ***' },
  { type: 'output', content: '' },
  { type: 'success', content: 'just kidding. rebooting…' },
]

interface TourStep {
  narrate?: string[]
  type?: string
}

// Guided demo: narration lines, then a command typed and executed for real.
const TOUR_STEPS: TourStep[] = [
  { narrate: ["", "*** GUIDED TOUR ***", "Sit back — I'll drive. Press any key to take over.", ""] },
  { narrate: ["Everything here is a command. help lists them:"], type: "help" },
  { narrate: ["Collections are directories. The books live in ~/books:"], type: "cd books" },
  { type: "ls" },
  { narrate: ["view pretty-prints any file:"], type: "view pulp" },
  { narrate: ["Vinyl works the same way:"], type: "cd ~/vinyl" },
  { narrate: ["search digs through the current collection:"], type: "search police" },
  { narrate: ["stats charts all of it:"], type: "stats" },
  { narrate: ["And there are games. Real ones:"], type: "game" },
  {
    narrate: [
      "",
      "That's the tour. A few things to try:",
      "  theme        change the look (rumor: a code unlocks an extra one)",
      "  wall         sign the guestbook",
      "  game tron    light cycles",
      "  Ctrl+K       fuzzy command palette",
      "",
      "The terminal is yours.",
      "",
    ],
  },
]

const TOUR_TYPE_MS = 40
const TOUR_STEP_PAUSE_MS = 900
const TOUR_PRE_TYPE_MS = 600
const TOUR_POST_TYPE_MS = 250
// Reduced motion still needs a real (if tiny) pause between steps: each
// command must see the previous one's state, which lands via a re-render +
// effect — a 0ms timer can race ahead of React's own scheduled work.
const TOUR_REDUCED_STEP_MS = 50

export function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>(initialHistory)
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [gameState, setGameState] = useState<GameState>({ active: false, type: null })
  const mountTime = useRef<number | null>(null)

  /* VFS Initialization */
  const [vfs] = useState(() => {
    const fs = new VirtualFileSystem()

    // Populate books
    const booksDir = fs.createDir("/home/zachary/books")
    booksData.forEach((book) => {
      const filename = book.title.toLowerCase().replace(/[^a-z0-9]/g, "-")
      if (booksDir.children) {
        booksDir.children[filename] = {
          name: filename,
          type: "file",
          parent: booksDir,
          content: book
        }
      }
    })

    // Populate vinyl
    const vinylDir = fs.createDir("/home/zachary/vinyl")
    vinylData.forEach((record) => {
      const filename = record.title.toLowerCase().replace(/[^a-z0-9]/g, "-")
      if (vinylDir.children) {
        vinylDir.children[filename] = {
          name: filename,
          type: "file",
          parent: vinylDir,
          content: record
        }
      }
    })

    // Populate hardware
    const hwDir = fs.createDir("/home/zachary/hardware")
    hardwareData.forEach((device) => {
      const filename = device.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
      if (hwDir.children) {
        hwDir.children[filename] = {
          name: filename,
          type: "file",
          parent: hwDir,
          content: device
        }
      }
    })

    // Populate notes
    const notesDir = fs.createDir("/home/zachary/notes")
    notesData.forEach((note) => {
      const filename = note.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+$/, "").replace(/^-+/, "")
      if (notesDir.children) {
        notesDir.children[filename] = {
          name: filename,
          type: "file",
          parent: notesDir,
          content: note
        }
      }
    })

    // Populate games
    const gamesDir = fs.createDir("/home/zachary/games")
    const games = ["number", "wordle", "trivia", "blackjack", "rps", "tron", "pacman", "basketball", "typespeed", "snake"]
    games.forEach(g => {
      if (gamesDir.children) {
        gamesDir.children[g] = { name: g, type: "file", parent: gamesDir, content: "game" }
      }
    })

    // Populate style
    const styleDir = fs.createDir("/home/zachary/style")
    if (styleDir.children) {
      styleDir.children["theme"] = { name: "theme", type: "file", parent: styleDir, content: "config" }
      styleDir.children["font"] = { name: "font", type: "file", parent: styleDir, content: "config" }
    }

    // Restore user mutations (mkdir/touch/rm) persisted from a previous visit.
    // Safe during init: nothing in the initial render depends on VFS contents,
    // so there is no hydration mismatch risk.
    if (typeof window !== "undefined") {
      const savedFS = localStorage.getItem("vfs-state")
      if (savedFS) fs.fromJSON(savedFS)
    }

    return fs
  })

  // Persistence helper
  const saveFileSystem = () => {
    localStorage.setItem("vfs-state", vfs.toJSON())
  }

  // Display path shown in the prompt; updated by the cd command via ExecuteContext
  const [currentDirectory, setCurrentDirectory] = useState("~")

  // Theme/font: read the persisted preference during init. The values only
  // affect CSS variables (applied in effects below), never rendered markup,
  // so reading localStorage here cannot cause a hydration mismatch.
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "midnight"
    let saved = localStorage.getItem("terminal-theme") as ThemeName | null
    // Legacy migration: the default theme was previously named "lumon"
    if ((saved as string | null) === "lumon") saved = "midnight"
    return saved && themes[saved] ? saved : "midnight"
  })
  const [currentFont, setCurrentFont] = useState<FontName>(() => {
    if (typeof window === "undefined") return "jetbrains"
    const saved = localStorage.getItem("terminal-font") as FontName | null
    return saved && fonts[saved] ? saved : "jetbrains"
  })
  const inputRef = useRef<InputLineHandle>(null)

  // Sync state to TerminalContext so TerminalChrome can read it
  const terminalCtx = useTerminalContext()
  const soundState = useSound()

  const isIdle = useIdleTimer(90000, !gameState.active)

  const handleDismissScreensaver = () => {
    // The idle timer resets on any input — just need to refocus
    inputRef.current?.focus()
  }

  const [showPalette, setShowPalette] = useState(false)
  const [editorTrap, setEditorTrap] = useState(false)

  // Konami code unlocks the hidden phosphor theme (persisted across visits)
  const [phosphorUnlocked, setPhosphorUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("phosphor-unlocked") === "true"
  })

  useEffect(() => {
    const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"]
    let progress = 0
    const onKey = (e: globalThis.KeyboardEvent) => {
      const key = e.key.toLowerCase()
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0
      if (progress === KONAMI.length) {
        progress = 0
        setPhosphorUnlocked(true)
        localStorage.setItem("phosphor-unlocked", "true")
        setHistory((prev) => [...prev, { type: "success", content: "*** PHOSPHOR MODE UNLOCKED — try `theme phosphor` ***" }])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleCommandPalette = () => setShowPalette(prev => !prev)

  useEffect(() => {
    terminalCtx.setCurrentDirectory(currentDirectory)
  }, [currentDirectory, terminalCtx.setCurrentDirectory]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    terminalCtx.setCurrentTheme(currentTheme)
  }, [currentTheme, terminalCtx.setCurrentTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    terminalCtx.setCurrentFont(currentFont)
  }, [currentFont, terminalCtx.setCurrentFont]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync sound state to context so status bar reflects it
  useEffect(() => {
    if (soundState.enabled !== terminalCtx.soundEnabled) {
      if (soundState.enabled) {
        if (!terminalCtx.soundEnabled) terminalCtx.toggleSound()
      } else {
        if (terminalCtx.soundEnabled) terminalCtx.toggleSound()
      }
    }
  }, [soundState.enabled, terminalCtx.soundEnabled, terminalCtx.toggleSound]) // eslint-disable-line react-hooks/exhaustive-deps

  // Record mount time for `uptime`
  useEffect(() => {
    if (mountTime.current === null) mountTime.current = Date.now()
  }, [])

  // Sync the active theme/font to CSS variables (external system: the DOM)
  useEffect(() => {
    const theme = themes[currentTheme]
    const root = document.documentElement
    root.style.setProperty("--background", theme.background)
    root.style.setProperty("--foreground", theme.foreground)
    root.style.setProperty("--card", theme.card)
    root.style.setProperty("--primary", theme.primary)
    root.style.setProperty("--muted-foreground", theme.muted)
    root.style.setProperty("--accent", theme.accent)
    root.style.setProperty("--destructive", theme.destructive)
    root.style.setProperty("--border", theme.border)
  }, [currentTheme])

  useEffect(() => {
    const font = fonts[currentFont]
    document.documentElement.style.setProperty("--font-mono", font.value)
    document.documentElement.style.setProperty("--font-sans", font.value)
  }, [currentFont])

  const setTheme = (themeName: ThemeName) => {
    setCurrentTheme(themeName)
    localStorage.setItem("terminal-theme", themeName)
  }

  const setFont = (fontName: FontName) => {
    setCurrentFont(fontName)
    localStorage.setItem("terminal-font", fontName)
  }

  // All available commands for tab completion
  const allCommands = [...VALID_COMMANDS]

  const getCompletions = (partial: string): string[] => {
    const parts = partial.split(" ")

    // If we're completing the first word (command)
    if (parts.length === 1) {
      return allCommands.filter(cmd => cmd.startsWith(partial.toLowerCase()))
    }

    // If we're completing arguments
    const cmd = parts[0].toLowerCase()
    const arg = parts[parts.length - 1].toLowerCase()

    // Dynamic completion for cd, cat, view, ls
    if (["cd", "cat", "view", "ls", "rm", "game"].includes(cmd)) {
      const files = vfs.ls()
      return files.filter(f => f.toLowerCase().startsWith(arg))
    }

    // Static maps for theme/font
    if (cmd === "theme") {
      return Object.keys(themes).filter(t => t.startsWith(arg))
    }

    if (cmd === "font") {
      return Object.keys(fonts).filter(f => f.startsWith(arg))
    }

    return []
  }

  // Game handlers
  const startNumberGame = () => {
    const target = Math.floor(Math.random() * 100) + 1
    setGameState({ active: true, type: "number", data: { target, attempts: 0 } })
    return [
      "",
      "NUMBER GUESSING GAME",
      "I'm thinking of a number between 1 and 100.",
      "Type 'quit' to exit.",
      "",
    ]
  }

  const handleNumberGame = (guess: string) => {
    if (guess.toLowerCase() === "quit") {
      setGameState({ active: false, type: null })
      return "Game ended."
    }

    const num = Number.parseInt(guess)
    if (isNaN(num)) {
      return "Please enter a valid number."
    }

    const data = gameState.data as { target: number; attempts: number }
    const attempts = data.attempts + 1
    const target = data.target

    if (num === target) {
      setGameState({ active: false, type: null })
      return [
        `Correct! You got it in ${attempts} attempts.`,
        `The number was ${target}.`,
        "",
      ]
    } else if (num < target) {
      setGameState({ ...gameState, data: { ...data, attempts } })
      return `Too low. (Attempt ${attempts})`
    } else {
      setGameState({ ...gameState, data: { ...data, attempts } })
      return `Too high. (Attempt ${attempts})`
    }
  }

  // Word list for Wordle
  const wordleWords = [
    "apple", "beach", "crane", "dance", "eagle", "flame", "grape", "house", "input", "jelly",
    "knife", "lemon", "mango", "night", "ocean", "piano", "queen", "river", "stone", "tiger",
    "ultra", "vivid", "whale", "xenon", "yacht", "zebra", "brain", "charm", "dream", "frost",
    "ghost", "heart", "jolly", "karma", "laser", "medal", "noble", "orbit", "pride", "quest",
    "radar", "space", "train", "unity", "voice", "world", "youth", "blaze", "cloud", "drift"
  ]

  const WORDLE_STREAK_KEY = "wordle-streak"
  const WORDLE_DAILY_KEY = "wordle-daily"

  interface DailyRecord {
    date: string
    rows: string[]
    won: boolean
    attempts: number
  }

  const readJSON = <T,>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  const startWordleGame = (gameArgs?: string[]) => {
    const practice = gameArgs?.[0] === "practice"
    const today = localDateString()

    if (!practice) {
      const record = readJSON<DailyRecord>(WORDLE_DAILY_KEY)
      if (record?.date === today) {
        const streak = readJSON<StreakRecord>(WORDLE_STREAK_KEY) ?? { lastWinDate: null, streak: 0 }
        return [
          "",
          record.won
            ? `Already solved today's wordle (${record.attempts}/6).`
            : "Already played today's wordle.",
          ...emojiGrid(record.rows),
          `Streak: ${streak.streak} day${streak.streak === 1 ? "" : "s"}`,
          "",
          "Come back tomorrow, or try 'game wordle practice'.",
          "",
        ]
      }
    }

    const word = practice
      ? wordleWords[Math.floor(Math.random() * wordleWords.length)]
      : dailyWord(today)
    setGameState({
      active: true,
      type: "wordle",
      data: { word, attempts: 0, maxAttempts: 6, guesses: [], mode: practice ? "practice" : "daily", dateStr: today },
    })
    return [
      "",
      practice ? "WORDLE (practice)" : `WORDLE — daily ${today}`,
      "Guess the 5-letter word in 6 tries.",
      "",
      "  GREEN  = correct position",
      "  YELLOW = wrong position",
      "  GRAY   = not in word",
      "",
      "Type 'quit' to exit.",
      "",
    ]
  }

  const handleWordleGame = (guess: string) => {
    if (guess.toLowerCase() === "quit") {
      setGameState({ active: false, type: null })
      const data = gameState.data as { word: string }
      return `The word was: ${data.word.toUpperCase()}`
    }

    const normalizedGuess = guess.toLowerCase().trim()
    if (normalizedGuess.length !== 5 || !/^[a-z]+$/.test(normalizedGuess)) {
      return "Enter a 5-letter word."
    }

    const data = gameState.data as { word: string; attempts: number; maxAttempts: number; guesses: string[]; mode?: string; dateStr?: string }
    const word = data.word
    const attempts = data.attempts + 1
    const guesses = [...data.guesses]

    // Daily mode: persist the completion, update the streak on a win, and
    // append the shareable emoji grid + streak to the final output.
    const finishDaily = (won: boolean, rows: string[]): string[] => {
      if (data.mode !== "daily") return []
      const dateStr = data.dateStr ?? localDateString()
      localStorage.setItem(WORDLE_DAILY_KEY, JSON.stringify({ date: dateStr, rows, won, attempts }))
      let streak = readJSON<StreakRecord>(WORDLE_STREAK_KEY) ?? { lastWinDate: null, streak: 0 }
      if (won) {
        streak = updateStreak(streak, dateStr)
        localStorage.setItem(WORDLE_STREAK_KEY, JSON.stringify(streak))
      }
      return [
        `Wordle ${dateStr} ${won ? `${attempts}/6` : "X/6"}`,
        ...emojiGrid(rows),
        `Streak: ${streak.streak} day${streak.streak === 1 ? "" : "s"}`,
      ]
    }

    // Build result
    const wordArr = word.split("")
    const guessArr = normalizedGuess.split("")
    const used = new Array(5).fill(false)

    // First pass: exact matches
    const marks = new Array(5).fill(" ")
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === wordArr[i]) {
        marks[i] = "X"
        used[i] = true
      }
    }

    // Second pass: wrong position
    for (let i = 0; i < 5; i++) {
      if (marks[i] !== "X") {
        for (let j = 0; j < 5; j++) {
          if (!used[j] && guessArr[i] === wordArr[j]) {
            marks[i] = "?"
            used[j] = true
            break
          }
        }
      }
    }

    // Build colored result: format is "X:A ?:B  :C" etc (mark:letter pairs)
    const result = guessArr.map((c, i) => `${marks[i]}:${c.toUpperCase()}`).join(",")
    guesses.push(result)

    const wordleResult = { wordle: result }

    if (normalizedGuess === word) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `You got it in ${attempts}/${data.maxAttempts}!`,
        ...finishDaily(true, guesses),
        "",
      ]
    }

    if (attempts >= data.maxAttempts) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `Game over. The word was: ${word.toUpperCase()}`,
        ...finishDaily(false, guesses),
        "",
      ]
    }

    setGameState({ ...gameState, data: { ...data, attempts, guesses } })
    return [wordleResult, `(${data.maxAttempts - attempts} guesses left)`]
  }

  // Trivia questions
  const triviaQuestions = [
    { q: "What planet is known as the Red Planet?", a: "mars" },
    { q: "What is the capital of Japan?", a: "tokyo" },
    { q: "How many bits are in a byte?", a: "8" },
    { q: "What year was the first iPhone released?", a: "2007" },
    { q: "What does HTTP stand for? (one word answer: hypertext...)", a: "protocol" },
    { q: "What is the chemical symbol for gold?", a: "au" },
    { q: "How many keys on a standard piano?", a: "88" },
    { q: "What programming language was created by Guido van Rossum?", a: "python" },
    { q: "What is the largest ocean on Earth?", a: "pacific" },
    { q: "In what year did the World Wide Web go public?", a: "1991" },
    { q: "What company created JavaScript?", a: "netscape" },
    { q: "How many bytes in a kilobyte?", a: "1024" },
    { q: "What is the hotkey to copy on Mac? (cmd+?)", a: "c" },
    { q: "What animal is Tux, the Linux mascot?", a: "penguin" },
    { q: "What does CSS stand for? (last word only)", a: "sheets" },
  ]

  const startTriviaGame = () => {
    const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5).slice(0, 5)
    setGameState({ active: true, type: "trivia", data: { questions: shuffled, current: 0, score: 0 } })
    return [
      "",
      "TRIVIA",
      "Answer 5 questions. Type 'quit' to exit.",
      "",
      `Q1: ${shuffled[0].q}`,
    ]
  }

  const handleTriviaGame = (answer: string) => {
    if (answer.toLowerCase() === "quit") {
      setGameState({ active: false, type: null })
      return "Trivia ended."
    }

    const data = gameState.data as { questions: { q: string; a: string }[]; current: number; score: number }
    const { questions, current, score } = data
    const correct = answer.toLowerCase().trim() === questions[current].a.toLowerCase()
    const newScore = correct ? score + 1 : score
    const next = current + 1

    if (next >= questions.length) {
      setGameState({ active: false, type: null })
      return [
        correct ? "Correct!" : `Wrong. Answer: ${questions[current].a}`,
        "",
        `Final score: ${newScore}/${questions.length}`,
        "",
      ]
    }

    setGameState({ ...gameState, data: { questions, current: next, score: newScore } })
    return [
      correct ? "Correct!" : `Wrong. Answer: ${questions[current].a}`,
      "",
      `Q${next + 1}: ${questions[next].q}`,
    ]
  }

  // Blackjack
  const createDeck = () => {
    const suits = ["S", "H", "D", "C"]
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const deck: string[] = []
    for (const suit of suits) {
      for (const value of values) {
        deck.push(`${value}${suit}`)
      }
    }
    return deck.sort(() => Math.random() - 0.5)
  }

  const cardValue = (card: string): number => {
    const val = card.slice(0, -1)
    if (val === "A") return 11
    if (["K", "Q", "J"].includes(val)) return 10
    return parseInt(val)
  }

  const handValue = (hand: string[]): number => {
    let total = hand.reduce((sum, card) => sum + cardValue(card), 0)
    let aces = hand.filter(c => c.startsWith("A")).length
    while (total > 21 && aces > 0) {
      total -= 10
      aces--
    }
    return total
  }

  const startBlackjackGame = () => {
    const deck = createDeck()
    const playerHand = [deck.pop()!, deck.pop()!]
    const dealerHand = [deck.pop()!, deck.pop()!]
    setGameState({
      active: true,
      type: "blackjack",
      data: { deck, playerHand, dealerHand, phase: "player" }
    })
    return [
      "",
      "BLACKJACK",
      "Commands: hit, stand, quit",
      "",
      `Dealer: ${dealerHand[0]} [?]`,
      `You: ${playerHand.join(" ")} (${handValue(playerHand)})`,
      "",
    ]
  }

  const handleBlackjackGame = (action: string) => {
    const cmd = action.toLowerCase().trim()
    const data = gameState.data as { deck: string[]; playerHand: string[]; dealerHand: string[]; phase: string }
    const { deck, playerHand, dealerHand, phase } = data

    if (cmd === "quit") {
      setGameState({ active: false, type: null })
      return "Left the table."
    }

    if (phase === "player") {
      if (cmd === "hit") {
        const newCard = deck.pop()!
        const newHand = [...playerHand, newCard]
        const total = handValue(newHand)

        if (total > 21) {
          setGameState({ active: false, type: null })
          return [
            `You draw: ${newCard}`,
            `You: ${newHand.join(" ")} (${total})`,
            "",
            "BUST! Dealer wins.",
            "",
          ]
        }

        setGameState({ ...gameState, data: { ...data, playerHand: newHand, deck } })
        return [
          `You draw: ${newCard}`,
          `You: ${newHand.join(" ")} (${total})`,
        ]
      }

      if (cmd === "stand") {
        // Dealer's turn
        const dHand = [...dealerHand]
        const dDeck = [...deck]

        while (handValue(dHand) < 17) {
          dHand.push(dDeck.pop()!)
        }

        const playerTotal = handValue(playerHand)
        const dealerTotal = handValue(dHand)

        setGameState({ active: false, type: null })

        let result = ""
        if (dealerTotal > 21) result = "Dealer busts. You win!"
        else if (dealerTotal > playerTotal) result = "Dealer wins."
        else if (playerTotal > dealerTotal) result = "You win!"
        else result = "Push (tie)."

        return [
          "",
          `Dealer: ${dHand.join(" ")} (${dealerTotal})`,
          `You: ${playerHand.join(" ")} (${playerTotal})`,
          "",
          result,
          "",
        ]
      }

      return "Commands: hit, stand, quit"
    }

    return "Invalid game state."
  }

  const startRPSGame = () => {
    setGameState({ active: true, type: "rps", data: { score: { player: 0, computer: 0 } } })
    return [
      "",
      "ROCK PAPER SCISSORS",
      "Enter: rock, paper, or scissors",
      "Type 'quit' to exit.",
      "",
    ]
  }

  const handleRPSGame = (choice: string) => {
    const normalized = choice.toLowerCase().trim()

    if (normalized === "quit") {
      const data = gameState.data as { score: { player: number; computer: number } }
      const score = data.score
      setGameState({ active: false, type: null })
      return [`Final Score: You ${score.player} - ${score.computer} Computer`, ""]
    }

    if (!["rock", "paper", "scissors"].includes(normalized)) {
      return "Invalid. Choose: rock, paper, or scissors"
    }

    const choices = ["rock", "paper", "scissors"]
    const computerChoice = choices[Math.floor(Math.random() * 3)]

    let result = ""
    const data = gameState.data as { score: { player: number; computer: number } }
    const newScore = { ...data.score }

    if (normalized === computerChoice) {
      result = "Tie."
    } else if (
      (normalized === "rock" && computerChoice === "scissors") ||
      (normalized === "paper" && computerChoice === "rock") ||
      (normalized === "scissors" && computerChoice === "paper")
    ) {
      result = "You win."
      newScore.player++
    } else {
      result = "Computer wins."
      newScore.computer++
    }

    setGameState({ ...gameState, data: { score: newScore } })

    return [
      `You: ${normalized} | Computer: ${computerChoice}`,
      `${result} (${newScore.player}-${newScore.computer})`,
    ]
  }

  const startTypespeedGame = () => {
    const sentences = pickSentences(Date.now())
    setGameState({
      active: true,
      type: "typespeed",
      data: { sentences, round: 0, results: [] as RoundResult[], startedAt: Date.now(), phase: "typing" },
    })
    return [
      "",
      "TYPESPEED",
      "Type each sentence exactly, then press Enter. 3 rounds.",
      "Type 'quit' to exit.",
      "",
      `[1/3] ${sentences[0]}`,
      "",
    ]
  }

  const handleTypespeedGame = (typed: string): string | string[] => {
    const data = gameState.data as {
      sentences: string[]
      round: number
      results: RoundResult[]
      startedAt: number
      phase: "typing" | "initials"
    }

    if (typed.toLowerCase().trim() === "quit") {
      setGameState({ active: false, type: null })
      return "Typespeed ended."
    }

    if (data.phase === "initials") {
      const entry = typed.trim()
      // 'q' is reserved as an exit alias — nobody loses their score to a
      // reflexive quit keystroke; actual Q initials can use "QQ" etc.
      if (entry.toLowerCase() === "skip" || entry.toLowerCase() === "q") {
        setGameState({ active: false, type: null })
        return ["Maybe next time.", ""]
      }
      if (!/^[a-zA-Z0-9]{1,3}$/.test(entry)) {
        return "Initials must be 1-3 letters/digits (or 'skip')."
      }
      const score = submittedScore(data.results)
      setGameState({ active: false, type: null })
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "typespeed", initials: entry.toUpperCase(), score, level: 1 }),
      })
        .then((response) => {
          setHistory((prev) => [
            ...prev,
            response.ok
              ? { type: "success", content: "Score posted. See it with 'highscores typespeed'." }
              : { type: "error", content: "Could not post the score (scoreboard offline?)." },
          ])
        })
        .catch(() => {
          setHistory((prev) => [...prev, { type: "error", content: "Could not post the score (network error)." }])
        })
      return ""
    }

    const target = data.sentences[data.round]
    const elapsed = Date.now() - data.startedAt
    const roundWpm = wpm(typed.length, elapsed)
    const roundAcc = accuracy(target, typed)
    const results = [...data.results, { wpm: roundWpm, accuracy: roundAcc }]
    const lines = [
      `  WPM ${roundWpm.toFixed(1)}  ·  accuracy ${(roundAcc * 100).toFixed(0)}%`,
      "",
    ]

    const nextRound = data.round + 1
    if (nextRound < data.sentences.length) {
      setGameState({ ...gameState, data: { ...data, round: nextRound, results, startedAt: Date.now() } })
      return [...lines, `[${nextRound + 1}/3] ${data.sentences[nextRound]}`, ""]
    }

    const score = submittedScore(results)
    setGameState({ ...gameState, data: { ...data, results, phase: "initials" } })
    return [
      ...lines,
      `FINAL SCORE: ${score.toLocaleString("en-US")}  (avg WPM × accuracy × 100)`,
      "",
      "Enter 1-3 initials to post it to the leaderboard, or 'skip' (q quits):",
      "",
    ]
  }

  const startSuggestCommand = () => {
    setGameState({ active: true, type: "suggest" })
    return [
      "",
      "GAME SUGGESTION BOX",
      "",
      "Type your game idea or suggestion, then press Enter.",
      "Type 'cancel' to exit.",
      "",
    ]
  }

  const handleSuggestCommand = async (input: string): Promise<string | string[]> => {
    if (input.toLowerCase() === "cancel") {
      setGameState({ active: false, type: null })
      return "Suggestion cancelled."
    }

    if (input.trim().length < 5) {
      return "Please enter a longer suggestion (at least 5 characters)."
    }

    // Submit to Formspree
    try {
      const response = await fetch("https://formspree.io/f/xrepkped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: input }),
      })

      setGameState({ active: false, type: null })

      if (response.ok) {
        return ["", "Thanks! Your suggestion has been sent.", ""]
      } else {
        return "Oops, something went wrong. Try again later."
      }
    } catch {
      setGameState({ active: false, type: null })
      return "Network error. Try again later."
    }
  }

  // Mirrors the historical inline styling heuristic for plain-string output
  const classifyLine = (line: string): TerminalLine["type"] =>
    line.startsWith("command not found") ||
    line.startsWith("Permission") ||
    line.includes("No such") ||
    line.includes("not in")
      ? "error"
      : "output"

  // Append a command result to history, preserving rich TerminalLine output
  const appendCommandOutput = (output: CommandOutput | null | undefined) => {
    if (output === null || output === undefined) return
    if (Array.isArray(output) && output.length > 0 && typeof output[0] === "object" && "type" in output[0]) {
      // TerminalLine[] — spread to preserve all properties (src, centered, href)
      setHistory((prev) => [...prev, ...(output as TerminalLine[]).map((item) => ({ ...item }))])
      return
    }
    const items = Array.isArray(output) ? output : [output]
    items.forEach((item) => {
      if (typeof item === "object" && item !== null && "type" in item && "content" in item) {
        setHistory((prev) => [...prev, { ...(item as TerminalLine) }])
      } else {
        const line = typeof item === "string" ? item : String(item)
        setHistory((prev) => [...prev, { type: classifyLine(line), content: line }])
      }
    })
  }

  // All state the registry commands need, rebuilt per invocation so commands
  // always see current values.
  const buildExecuteContext = (): ExecuteContext => ({
    vfs: {
      pwd: () => vfs.getPwd(),
      cd: (path) => vfs.cd(path),
      ls: (path) => vfs.ls(path),
      resolve: (path) => vfs.resolve(path),
      mkdir: (path) => { const err = vfs.mkdir(path); if (!err) saveFileSystem(); return err },
      touch: (path) => { const err = vfs.touch(path); if (!err) saveFileSystem(); return err },
      rm: (path) => { const err = vfs.rm(path); if (!err) saveFileSystem(); return err },
    },
    history: {
      add: (line) => setHistory((prev) => [...prev, line]),
      clear: () => setHistory(initialHistory),
      commands: () => commandHistory,
    },
    game: {
      start: (type, gameArgs) => {
        if (type === "number") return startNumberGame()
        if (type === "wordle") return startWordleGame(gameArgs)
        if (type === "trivia") return startTriviaGame()
        if (type === "blackjack") return startBlackjackGame()
        if (type === "rps") return startRPSGame()
        if (type === "typespeed") return startTypespeedGame()
        // Canvas games: UI takes over
        setGameState({ active: true, type })
        return []
      },
      end: () => setGameState({ active: false, type: null }),
      isActive: () => gameState.active,
    },
    theme: {
      current: currentTheme,
      set: setTheme,
      // Hidden themes stay out of the list (and thus out of `theme <name>`
      // validation and completion) until unlocked via the Konami code
      list: () =>
        (Object.keys(themes) as ThemeName[]).filter(
          (t) => !HIDDEN_THEMES.includes(t) || phosphorUnlocked
        ),
      config: (name) => themes[name],
    },
    font: {
      current: currentFont,
      set: setFont,
      list: () => Object.keys(fonts) as FontName[],
      config: (name) => fonts[name],
    },
    sound: {
      enabled: soundState.enabled,
      toggle: soundState.toggle,
    },
    uptime: () => Date.now() - (mountTime.current ?? Date.now()),
    currentDirectory,
    setCurrentDirectory,
    openUrl: (url) => window.open(url, "_blank"),
    collections: {
      books: booksData,
      vinyl: vinylData,
      hardware: hardwareData,
      notes: notesData,
    },
  })

  // Timed "script" playback for theatrical easter eggs (sl, rm -rf /).
  // Reduced motion renders the whole script instantly.
  const scriptTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const scriptLock = useRef(false)
  useEffect(() => {
    const timers = scriptTimers.current
    return () => timers.forEach(clearTimeout)
  }, [])

  const playScript = (lines: TerminalLine[], stepMs: number, onDone?: () => void, holdLock = false) => {
    // holdLock: the caller's onDone owns releasing scriptLock (e.g. the
    // meltdown keeps input swallowed until the reboot actually happens)
    const finish = () => {
      if (!holdLock) scriptLock.current = false
      onDone?.()
    }
    scriptLock.current = true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setHistory((prev) => [...prev, ...lines])
      finish()
      return
    }
    lines.forEach((line, i) => {
      scriptTimers.current.push(
        setTimeout(() => {
          setHistory((prev) => [...prev, line])
          if (i === lines.length - 1) finish()
        }, (i + 1) * stepMs)
      )
    })
  }

  // --- tour: data-driven guided demo ---
  const [isTouring, setIsTouring] = useState(false)
  const tourActive = useRef(false)
  const tourTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const timers = tourTimers.current
    return () => timers.forEach(clearTimeout)
  }, [])

  const tourDelay = (ms: number) =>
    new Promise<void>((resolve) => tourTimers.current.push(setTimeout(resolve, ms)))

  const stopTour = (aborted: boolean) => {
    tourActive.current = false
    setIsTouring(false)
    tourTimers.current.forEach(clearTimeout)
    tourTimers.current = []
    setInput("")
    if (aborted) {
      setHistory((prev) => [...prev, { type: "success", content: "(tour ended — the terminal is yours)" }])
    }
  }

  // Any keypress while the tour is driving hands control back to the user
  useEffect(() => {
    if (!isTouring) return
    const abort = () => stopTour(true)
    window.addEventListener("keydown", abort)
    return () => window.removeEventListener("keydown", abort)
  }, [isTouring])

  // Mirror handleCommand for one-shot consumers (deep links, the tour).
  // Declared before its dependents; reassigned to the fresh closure each
  // render by an effect below handleCommand.
  const handleCommandRef = useRef<(cmd: string, opts?: { fromTour?: boolean }) => void>(() => {})

  const startTour = async () => {
    if (tourActive.current) return
    tourActive.current = true
    setIsTouring(true)
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    for (const step of TOUR_STEPS) {
      if (!tourActive.current) return
      for (const line of step.narrate ?? []) {
        setHistory((prev) => [...prev, { type: "success", content: line }])
      }
      if (step.type) {
        const command = step.type
        if (reduced) {
          await tourDelay(TOUR_REDUCED_STEP_MS) // let the previous command's state land
          if (!tourActive.current) return
          handleCommandRef.current(command, { fromTour: true })
        } else {
          await tourDelay(TOUR_PRE_TYPE_MS)
          for (let i = 1; i <= command.length; i++) {
            if (!tourActive.current) return
            setInput(command.slice(0, i))
            await tourDelay(TOUR_TYPE_MS)
          }
          if (!tourActive.current) return
          await tourDelay(TOUR_POST_TYPE_MS)
          if (!tourActive.current) return
          handleCommandRef.current(command, { fromTour: true })
        }
      }
      if (!reduced) await tourDelay(TOUR_STEP_PAUSE_MS)
    }
    tourActive.current = false
    setIsTouring(false)
  }

  const handleCommand = async (cmd: string, opts?: { fromTour?: boolean }) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    // A user-submitted command while the tour is driving = taking over
    if (tourActive.current && !opts?.fromTour) {
      stopTour(true)
      return
    }

    // bash-style history expansion: `!!` = previous command, `!n` = nth
    let expandedCmd = trimmedCmd
    const bang = trimmedCmd.match(/^!(!|\d+)$/)
    if (bang) {
      const target = bang[1] === "!" ? commandHistory[commandHistory.length - 1] : commandHistory[parseInt(bang[1], 10) - 1]
      if (!target) {
        setHistory((prev) => [
          ...prev,
          { type: "input", content: `${currentDirectory} $ ${trimmedCmd}` },
          { type: "error", content: `${trimmedCmd}: event not found` },
        ])
        setInput("")
        return
      }
      expandedCmd = target
    }

    // Theatrical easter eggs: swallow input (without echo) while a script
    // is mid-performance — keeps the train/meltdown art uninterrupted
    if (scriptLock.current) {
      setInput("")
      return
    }

    setHistory((prev) => [...prev, { type: "input", content: `${currentDirectory} $ ${expandedCmd}` }])

    // The vim trap traps everything — including the other easter eggs
    if (editorTrap) {
      if (/^:(q!?|wq|x)$/.test(expandedCmd)) {
        setEditorTrap(false)
        setHistory((prev) => [
          ...prev,
          { type: "success", content: "you are free now. (this terminal only has one editor: your browser devtools)" },
        ])
      } else {
        setHistory((prev) => [...prev, { type: "error", content: `E492: Not an editor command: ${expandedCmd}` }])
      }
      setInput("")
      return
    }

    // Easter eggs never hijack game input
    if (!gameState.active && /^rm\s+(-rf|-fr)\s+\/\s*$/.test(expandedCmd)) {
      playScript(
        MELTDOWN_LINES,
        250,
        () => {
          scriptTimers.current.push(
            setTimeout(() => {
              setHistory(initialHistory)
              setEditorTrap(false)
              scriptLock.current = false
            }, 1200)
          )
        },
        true
      )
      setInput("")
      return
    }

    if (!gameState.active && expandedCmd === "sl") {
      playScript(TRAIN_FRAME.map((content) => ({ type: "output" as const, content })), 120)
      setInput("")
      return
    }

    if (!gameState.active && /^(vim|vi|nano|emacs)$/.test(expandedCmd)) {
      setEditorTrap(true)
      setHistory((prev) => [
        ...prev,
        { type: "output", content: "" },
        { type: "output", content: "~                    VIM - Vi IMproved" },
        { type: "output", content: "~                     (sort of. not really.)" },
        { type: "output", content: "~" },
        { type: "output", content: "~        you're trapped. type :q! to escape" },
        { type: "output", content: "" },
      ])
      setInput("")
      return
    }

    if (gameState.active) {
      // Handle async suggest command separately
      if (gameState.type === "suggest") {
        handleSuggestCommand(expandedCmd).then(result => {
          const lines = Array.isArray(result) ? result : [result]
          lines.forEach(line => {
            setHistory(prev => [...prev, { type: "output", content: line }])
          })
        })
        setInput("")
        return
      }

      let result: string | (string | { wordle: string })[]
      if (gameState.type === "number") {
        result = handleNumberGame(expandedCmd)
      } else if (gameState.type === "wordle") {
        result = handleWordleGame(expandedCmd)
      } else if (gameState.type === "trivia") {
        result = handleTriviaGame(expandedCmd)
      } else if (gameState.type === "blackjack") {
        result = handleBlackjackGame(expandedCmd)
      } else if (gameState.type === "rps") {
        result = handleRPSGame(expandedCmd)
      } else if (gameState.type === "typespeed") {
        result = handleTypespeedGame(expandedCmd)
      } else {
        result = "Error: Unknown game state"
      }

      const lines = Array.isArray(result) ? result : [result]
      lines.forEach((line) => {
        if (typeof line === "object" && "wordle" in line) {
          setHistory((prev) => [...prev, { type: "wordle", content: (line as { wordle: string }).wordle }])
        } else {
          setHistory((prev) => [...prev, { type: "output", content: String(line) }])
        }
      })
      setInput("")
      return
    }

    setCommandHistory((prev) => [...prev, expandedCmd])
    setHistoryIndex(-1)
    // Clear before dispatch: async commands (fetches) must not freeze the input
    setInput("")

    const [command] = expandedCmd.split(" ")
    const cmd_lower = command.toLowerCase()

    // `suggest` runs an async interactive flow owned by the terminal
    if (cmd_lower === "suggest") {
      appendCommandOutput(startSuggestCommand())
    } else if (cmd_lower === "tour") {
      void startTour()
    } else {
      const result = await executeCommand(expandedCmd, buildExecuteContext(), commandRegistry)
      if (result.success) {
        appendCommandOutput(result.output)
      } else {
        setHistory((prev) => [...prev, { type: classifyLine(result.error), content: result.error }])
      }
    }
  }

  const handlePaletteExecute = (command: string) => {
    const parts = command.split(' && ')
    for (const part of parts) {
      handleCommand(part.trim())
    }
  }

  // Register handleCommand for executeCommand (called every render; ref assignment is cheap)
  useEffect(() => {
    terminalCtx.registerCommandHandler(handleCommand)
  })

  // Keep the command ref pointing at the freshest closure
  useEffect(() => {
    handleCommandRef.current = handleCommand
  })

  // Shareable deep links: /?cmd=ls%20~/books runs the command(s) on load.
  // Deferred to a macrotask so execution happens outside the effect body and
  // after the first paint.
  const deepLinkRan = useRef(false)
  useEffect(() => {
    if (deepLinkRan.current) return
    deepLinkRan.current = true
    const cmd = new URLSearchParams(window.location.search).get("cmd")
    if (!cmd) return
    const timer = setTimeout(() => {
      cmd.split("&&").forEach((part) => {
        const trimmed = part.trim()
        if (trimmed) handleCommandRef.current(trimmed)
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // InputLine callback handlers
  const handleTabComplete = (partial: string) => {
    const completions = getCompletions(partial)
    if (completions.length === 1) {
      const parts = partial.split(" ")
      if (parts.length === 1) {
        setInput(completions[0])
      } else {
        parts[parts.length - 1] = completions[0]
        setInput(parts.join(" "))
      }
    } else if (completions.length > 1) {
      setHistory(prev => [
        ...prev,
        { type: "input", content: `${currentDirectory} $ ${partial}` },
        { type: "output", content: completions.join("  ") },
      ])
    }
  }

  const handleHistoryUp = (): string | null => {
    if (commandHistory.length === 0) return null
    const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
    setHistoryIndex(newIndex)
    return commandHistory[newIndex]
  }

  const handleHistoryDown = (): string | null => {
    if (historyIndex === -1) return null
    const newIndex = historyIndex + 1
    if (newIndex >= commandHistory.length) {
      setHistoryIndex(-1)
      return null
    }
    setHistoryIndex(newIndex)
    return commandHistory[newIndex]
  }

  const handleClear = () => {
    setHistory(initialHistory)
  }

  const handleInterrupt = () => {
    if (gameState.active) {
      setHistory(prev => [...prev, { type: "output", content: "^C" }])
      setHistory(prev => [...prev, { type: "output", content: "Game interrupted." }])
      setGameState({ active: false, type: null })
      setInput("")
    }
  }

  // Touch devices have no keydowns, so every key-bar button doubles as the
  // "user takes over" signal while the tour is driving.
  const withTourGuard = (action: () => void) => () => {
    if (tourActive.current) {
      stopTour(true)
      return
    }
    action()
  }

  const prompt = gameState.active ? `[${gameState.type}]` : `${currentDirectory} $`

  // Fish-style ghost suggestion: most recent history entry extending the input
  const ghostSuggestion =
    input.length > 0
      ? [...commandHistory].reverse().find((c) => c.startsWith(input) && c !== input)
      : undefined

  return (
    <div
      className="h-full w-full bg-background p-4 md:p-6 font-mono text-sm md:text-base cursor-text flex flex-col relative"
      onClick={() => inputRef.current?.focus()}
    >
      {gameState.type === "tron" && gameState.active ? (
        <div className="absolute inset-0 z-50 bg-background">
          <TronGame onExit={() => setGameState({ active: false, type: null })} />
        </div>
      ) : gameState.type === "pacman" && gameState.active ? (
        <div className="absolute inset-0 z-50 bg-background">
          <PacmanGame onExit={() => setGameState({ active: false, type: null })} />
        </div>
      ) : gameState.type === "basketball" && gameState.active ? (
        <div className="absolute inset-0 z-50 bg-background">
          <BasketballGame onExit={() => setGameState({ active: false, type: null })} />
        </div>
      ) : gameState.type === "snake" && gameState.active ? (
        <div className="absolute inset-0 z-50 bg-background">
          <SnakeGame onExit={() => setGameState({ active: false, type: null })} />
        </div>
      ) : (
        <>
          <HistoryDisplay history={history} />
          <MobileKeyBar
            onTab={withTourGuard(() => handleTabComplete(input))}
            onHistoryUp={withTourGuard(() => {
              const cmd = handleHistoryUp()
              if (cmd !== null) setInput(cmd)
            })}
            onHistoryDown={withTourGuard(() => {
              const cmd = handleHistoryDown()
              setInput(cmd ?? "")
            })}
            onInterrupt={withTourGuard(handleInterrupt)}
            onEscape={withTourGuard(() => {
              setShowPalette(false)
              setInput("")
            })}
            onCommandPalette={withTourGuard(handleCommandPalette)}
          />
          <InputLine
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleCommand}
            onTabComplete={handleTabComplete}
            onHistoryUp={handleHistoryUp}
            onHistoryDown={handleHistoryDown}
            onClear={handleClear}
            onInterrupt={handleInterrupt}
            onCommandPalette={handleCommandPalette}
            prompt={prompt}
            validCommands={gameState.active ? [] : [...VALID_COMMANDS]}
            suggestion={gameState.active ? undefined : ghostSuggestion}
          />
        </>
      )}
      {isIdle && !gameState.active && (
        <Screensaver onDismiss={handleDismissScreensaver} />
      )}
      {showPalette && (
        <CommandPalette
          onClose={() => { setShowPalette(false); inputRef.current?.focus() }}
          onExecute={handlePaletteExecute}
        />
      )}
    </div>
  )
}
