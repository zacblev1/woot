"use client"

import type React from "react"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"

import { useState, useRef, useEffect } from "react"

interface TerminalLine {
  type: "input" | "output" | "error" | "success" | "link" | "wordle"
  content: string
  href?: string
}

interface GameState {
  active: boolean
  type: "number" | "wordle" | "trivia" | "blackjack" | "rps" | null
  data?: any
}

const themes = {
  lumon: {
    name: "Lumon",
    background: "#0a1628",
    foreground: "#e8f4f8",
    card: "#0d1e36",
    primary: "#4fd1c5",
    muted: "#94a3b8",
    accent: "#4fd1c5",
    destructive: "#f56565",
    border: "#2d4a6f",
  },
  tokyonight: {
    name: "Tokyo Night",
    background: "#1a1b26",
    foreground: "#c0caf5",
    card: "#1a1b26",
    primary: "#7aa2f7",
    muted: "#565f89",
    accent: "#9ece6a",
    destructive: "#f7768e",
    border: "#3b4261",
  },
  dracula: {
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    card: "#282a36",
    primary: "#bd93f9",
    muted: "#6272a4",
    accent: "#50fa7b",
    destructive: "#ff5555",
    border: "#44475a",
  },
  gruvbox: {
    name: "Gruvbox",
    background: "#282828",
    foreground: "#ebdbb2",
    card: "#282828",
    primary: "#fabd2f",
    muted: "#928374",
    accent: "#b8bb26",
    destructive: "#fb4934",
    border: "#3c3836",
  },
  nord: {
    name: "Nord",
    background: "#2e3440",
    foreground: "#eceff4",
    card: "#2e3440",
    primary: "#88c0d0",
    muted: "#4c566a",
    accent: "#a3be8c",
    destructive: "#bf616a",
    border: "#3b4252",
  },
  monokai: {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    card: "#272822",
    primary: "#66d9ef",
    muted: "#75715e",
    accent: "#a6e22e",
    destructive: "#f92672",
    border: "#3e3d32",
  },
}

type ThemeName = keyof typeof themes

const fonts = {
  jetbrains: {
    name: "JetBrains Mono",
    value: '"JetBrains Mono", monospace',
  },
  fira: {
    name: "Fira Code",
    value: '"Fira Code", monospace',
  },
  source: {
    name: "Source Code Pro",
    value: '"Source Code Pro", monospace',
  },
  ibm: {
    name: "IBM Plex Mono",
    value: '"IBM Plex Mono", monospace',
  },
  hack: {
    name: "Hack",
    value: '"Hack", monospace',
  },
  mono: {
    name: "System Mono",
    value: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
}

type FontName = keyof typeof fonts

export function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: "output", content: "" },
    { type: "success", content: "zachary@home" },
    { type: "output", content: "" },
    { type: "output", content: "Type 'help' for available commands." },
    { type: "output", content: "" },
  ])
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [gameState, setGameState] = useState<GameState>({ active: false, type: null })
  const [currentDirectory, setCurrentDirectory] = useState("~")
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("lumon")
  const [currentFont, setCurrentFont] = useState<FontName>("jetbrains")
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Load theme and font from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("terminal-theme") as ThemeName | null
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme)
      applyTheme(savedTheme)
    }
    const savedFont = localStorage.getItem("terminal-font") as FontName | null
    if (savedFont && fonts[savedFont]) {
      setCurrentFont(savedFont)
      applyFont(savedFont)
    }
  }, [])

  const applyTheme = (themeName: ThemeName) => {
    const theme = themes[themeName]
    const root = document.documentElement
    root.style.setProperty("--background", theme.background)
    root.style.setProperty("--foreground", theme.foreground)
    root.style.setProperty("--card", theme.card)
    root.style.setProperty("--primary", theme.primary)
    root.style.setProperty("--muted-foreground", theme.muted)
    root.style.setProperty("--accent", theme.accent)
    root.style.setProperty("--destructive", theme.destructive)
    root.style.setProperty("--border", theme.border)
  }

  const setTheme = (themeName: ThemeName) => {
    setCurrentTheme(themeName)
    applyTheme(themeName)
    localStorage.setItem("terminal-theme", themeName)
  }

  const applyFont = (fontName: FontName) => {
    const font = fonts[fontName]
    document.documentElement.style.setProperty("--font-mono", font.value)
    document.documentElement.style.setProperty("--font-sans", font.value)
  }

  const setFont = (fontName: FontName) => {
    setCurrentFont(fontName)
    applyFont(fontName)
    localStorage.setItem("terminal-font", fontName)
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Scroll input into view when focused (for mobile keyboard)
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleFocus = () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: "smooth", block: "end" })
      }, 300)
    }

    input.addEventListener("focus", handleFocus)
    return () => input.removeEventListener("focus", handleFocus)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (gameState.active) {
          e.preventDefault()
          setHistory((prev) => [...prev, { type: "output", content: "^C" }])
          setHistory((prev) => [...prev, { type: "output", content: "Game interrupted." }])
          setGameState({ active: false, type: null })
          setInput("")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState.active])

  // All available commands
  const allCommands = [
    "help", "ls", "cd", "pwd", "about", "contact", "projects", "clear",
    "whoami", "date", "echo", "game", "neofetch", "theme", "font", "view", "search",
    "genre", "format", "type", "cat", "sudo", "exit"
  ]

  const directories = ["books", "vinyl", "hardware", "games", "style"]

  const getCompletions = (partial: string): string[] => {
    const parts = partial.split(" ")

    // If we're completing the first word (command)
    if (parts.length === 1) {
      return allCommands.filter(cmd => cmd.startsWith(partial.toLowerCase()))
    }

    // If we're completing arguments
    const cmd = parts[0].toLowerCase()
    const arg = parts[parts.length - 1].toLowerCase()

    if (cmd === "cd") {
      return directories.filter(d => d.startsWith(arg))
    }

    if (cmd === "theme") {
      return Object.keys(themes).filter(t => t.startsWith(arg))
    }

    if (cmd === "game") {
      return ["number", "wordle", "trivia", "blackjack", "rps"].filter(g => g.startsWith(arg))
    }

    if (cmd === "font") {
      return Object.keys(fonts).filter(f => f.startsWith(arg))
    }

    return []
  }

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

    const attempts = gameState.data.attempts + 1
    const target = gameState.data.target

    if (num === target) {
      setGameState({ active: false, type: null })
      return [
        `Correct! You got it in ${attempts} attempts.`,
        `The number was ${target}.`,
        "",
      ]
    } else if (num < target) {
      setGameState({ ...gameState, data: { ...gameState.data, attempts } })
      return `Too low. (Attempt ${attempts})`
    } else {
      setGameState({ ...gameState, data: { ...gameState.data, attempts } })
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

  const startWordleGame = () => {
    const word = wordleWords[Math.floor(Math.random() * wordleWords.length)]
    setGameState({ active: true, type: "wordle", data: { word, attempts: 0, maxAttempts: 6, guesses: [] } })
    return [
      "",
      "WORDLE",
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
      return `The word was: ${gameState.data.word.toUpperCase()}`
    }

    const normalizedGuess = guess.toLowerCase().trim()
    if (normalizedGuess.length !== 5 || !/^[a-z]+$/.test(normalizedGuess)) {
      return "Enter a 5-letter word."
    }

    const word = gameState.data.word
    const attempts = gameState.data.attempts + 1
    const guesses = [...gameState.data.guesses]

    // Build result
    let result = ""
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
    result = guessArr.map((c, i) => `${marks[i]}:${c.toUpperCase()}`).join(",")
    guesses.push(result)

    const wordleResult = { wordle: result }

    if (normalizedGuess === word) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `You got it in ${attempts}/${gameState.data.maxAttempts}!`,
        "",
      ]
    }

    if (attempts >= gameState.data.maxAttempts) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `Game over. The word was: ${word.toUpperCase()}`,
        "",
      ]
    }

    setGameState({ ...gameState, data: { ...gameState.data, attempts, guesses } })
    return [wordleResult, `(${gameState.data.maxAttempts - attempts} guesses left)`]
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

    const { questions, current, score } = gameState.data
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
    const suits = ["♠", "♥", "♦", "♣"]
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
    const { deck, playerHand, dealerHand, phase } = gameState.data

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

        setGameState({ ...gameState, data: { ...gameState.data, playerHand: newHand, deck } })
        return [
          `You draw: ${newCard}`,
          `You: ${newHand.join(" ")} (${total})`,
        ]
      }

      if (cmd === "stand") {
        // Dealer's turn
        let dHand = [...dealerHand]
        let dDeck = [...deck]

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
      const score = gameState.data.score
      setGameState({ active: false, type: null })
      return [`Final Score: You ${score.player} - ${score.computer} Computer`, ""]
    }

    if (!["rock", "paper", "scissors"].includes(normalized)) {
      return "Invalid. Choose: rock, paper, or scissors"
    }

    const choices = ["rock", "paper", "scissors"]
    const computerChoice = choices[Math.floor(Math.random() * 3)]

    let result = ""
    const newScore = { ...gameState.data.score }

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

  const commands: Record<string, (args: string[]) => (string | { text: string; href: string })[]| string | { text: string; href: string }> = {
    help: () => {
      if (currentDirectory === "~/books") {
        return [
          "",
          "COMMANDS (~/books)",
          "",
          "  ls             List all books",
          "  view <n>       View book details",
          "  search <term>  Search by title/author",
          "  genre [name]   Filter by genre",
          "  format [type]  Filter by format",
          "  cd ..          Back to home",
          "  clear          Clear screen",
          "",
        ]
      }
      if (currentDirectory === "~/vinyl") {
        return [
          "",
          "COMMANDS (~/vinyl)",
          "",
          "  ls             List all records",
          "  view <n>       View record details",
          "  search <term>  Search by title/artist",
          "  genre [name]   Filter by genre",
          "  format [type]  Filter by format",
          "  cd ..          Back to home",
          "  clear          Clear screen",
          "",
        ]
      }
      if (currentDirectory === "~/hardware") {
        return [
          "",
          "COMMANDS (~/hardware)",
          "",
          "  ls             List all devices",
          "  view <n>       View device details",
          "  search <term>  Search by name/type",
          "  type [name]    Filter by type",
          "  cd ..          Back to home",
          "  clear          Clear screen",
          "",
        ]
      }
      if (currentDirectory === "~/style") {
        return [
          "",
          "COMMANDS (~/style)",
          "",
          "  ls             List style options",
          "  theme [name]   View/set color theme",
          "  font [name]    View/set terminal font",
          "  cd ..          Back to home",
          "  clear          Clear screen",
          "",
        ]
      }
      return [
        "",
        "COMMANDS",
        "",
        "  ls             List directories",
        "  cd <dir>       Change directory",
        "  pwd            Print working directory",
        "  about          About me",
        "  contact        Contact info",
        "  projects       Open GitHub",
        "  clear          Clear screen",
        "  game <type>    Play a game (number, hack, rps)",
        "",
      ]
    },
    ls: () => {
      if (currentDirectory === "~/books") {
        const list = booksData.map(
          (book, i) => `  ${String(i + 1).padStart(3, " ")}  ${book.title} — ${book.author}`,
        )
        return ["", `${booksData.length} books`, "", ...list, ""]
      } else if (currentDirectory === "~/vinyl") {
        const list = vinylData.map(
          (record, i) => `  ${String(i + 1).padStart(3, " ")}  ${record.title} — ${record.artist}`,
        )
        return ["", `${vinylData.length} records`, "", ...list, ""]
      } else if (currentDirectory === "~/hardware") {
        const list = hardwareData.map(
          (device, i) => `  ${String(i + 1).padStart(3, " ")}  ${device.name} (${device.type})`,
        )
        return ["", `${hardwareData.length} devices`, "", ...list, ""]
      } else if (currentDirectory === "~/games") {
        return [
          "",
          "  number      Guess the number",
          "  wordle      Guess the 5-letter word",
          "  trivia      Answer trivia questions",
          "  blackjack   Play 21 against dealer",
          "  rps         Rock Paper Scissors",
          "",
        ]
      } else if (currentDirectory === "~/style") {
        return [
          "",
          "  theme     Color themes",
          "  font      Terminal fonts",
          "",
          "Use 'theme' or 'font' to see options",
          "",
        ]
      }
      return [
        "",
        "  books/      Book collection",
        "  vinyl/      Vinyl collection",
        "  hardware/   Hardware inventory",
        "  games/      Terminal games",
        "  style/      Themes & fonts",
        "",
      ]
    },
    cd: (args) => {
      const dir = args[0]?.toLowerCase().replace("/", "")

      if (dir === ".." || dir === "../") {
        setCurrentDirectory("~")
        return ""
      }

      if (!dir || dir === "~" || dir === "home") {
        setCurrentDirectory("~")
        return ""
      }

      const validDirs = ["books", "vinyl", "hardware", "games", "style"]

      if (validDirs.includes(dir)) {
        setCurrentDirectory(`~/${dir}`)
        return ""
      }

      if (dir === "about") return commands.about([])
      if (dir === "contact") return commands.contact([])
      if (dir === "projects") return commands.projects([])

      return `cd: ${dir}: No such directory`
    },
    pwd: () => `/home/zachary${currentDirectory.slice(1)}`,
    about: () => [
      "",
      "Zachary",
      "Creative Technologist",
      "",
      "Building digital experiences that are thoughtful,",
      "accessible, and built to last.",
      "",
      "Interests: philosophy, programming, travel, making things",
      "",
    ],
    contact: () => [
      "",
      { text: "Email    zachary@thefrenchjockey.com", href: "mailto:zachary@thefrenchjockey.com" },
      { text: "GitHub   github.com/zacblev1", href: "https://github.com/zacblev1" },
      "",
    ],
    projects: () => {
      window.open("https://github.com/zacblev1", "_blank")
      return "Opening GitHub..."
    },
    theme: (args) => {
      const themeName = args[0]?.toLowerCase() as ThemeName

      if (!themeName) {
        const themeList = Object.entries(themes).map(([key, val]) =>
          `  ${key === currentTheme ? "* " : "  "}${key.padEnd(12)} ${val.name}`
        )
        return ["", "Available themes:", "", ...themeList, "", "Usage: theme <name>", ""]
      }

      if (!themes[themeName]) {
        return `Unknown theme: ${themeName}. Type 'theme' to see available themes.`
      }

      setTheme(themeName)
      return `Theme set to ${themes[themeName].name}`
    },
    font: (args) => {
      const fontName = args[0]?.toLowerCase() as FontName

      if (!fontName) {
        const fontList = Object.entries(fonts).map(([key, val]) =>
          `  ${key === currentFont ? "* " : "  "}${key.padEnd(12)} ${val.name}`
        )
        return ["", "Available fonts:", "", ...fontList, "", "Usage: font <name>", ""]
      }

      if (!fonts[fontName]) {
        return `Unknown font: ${fontName}. Type 'font' to see available fonts.`
      }

      setFont(fontName)
      return `Font set to ${fonts[fontName].name}`
    },
    view: (args) => {
      const num = Number.parseInt(args[0])

      if (currentDirectory === "~/books") {
        if (!args[0] || isNaN(num)) return "Usage: view <number>"
        const book = booksData[num - 1]
        if (!book) return `No book at position ${num}`
        return [
          "",
          `  Title:   ${book.title}`,
          `  Author:  ${book.author}`,
          `  Genre:   ${book.genre}`,
          `  Format:  ${book.format}`,
          book.pages ? `  Pages:   ${book.pages}` : "",
          "",
        ].filter(Boolean) as string[]
      }

      if (currentDirectory === "~/vinyl") {
        if (!args[0] || isNaN(num)) return "Usage: view <number>"
        const record = vinylData[num - 1]
        if (!record) return `No record at position ${num}`
        return [
          "",
          `  Title:   ${record.title}`,
          `  Artist:  ${record.artist}`,
          `  Genre:   ${record.genre}`,
          `  Format:  ${record.format}`,
          `  Label:   ${record.label}`,
          "",
        ]
      }

      if (currentDirectory === "~/hardware") {
        if (!args[0] || isNaN(num)) return "Usage: view <number>"
        const device = hardwareData[num - 1]
        if (!device) return `No device at position ${num}`
        return [
          "",
          `  Name:       ${device.name}`,
          `  Type:       ${device.type}`,
          `  Status:     ${device.status}`,
          `  Processor:  ${device.processor}`,
          `  Memory:     ${device.memory}`,
          `  Storage:    ${device.storage}`,
          device.graphics ? `  Graphics:   ${device.graphics}` : "",
          device.operating_system ? `  OS:         ${device.operating_system}` : "",
          "",
        ].filter(Boolean) as string[]
      }

      return "view: not in a collection directory"
    },
    search: (args) => {
      const term = args.join(" ").toLowerCase()
      if (!term) return "Usage: search <term>"

      if (currentDirectory === "~/vinyl") {
        const results = vinylData.filter(
          (r) => r.title.toLowerCase().includes(term) || r.artist.toLowerCase().includes(term),
        )
        if (results.length === 0) return `No results for "${term}"`
        const list = results.map((r) => {
          const idx = vinylData.indexOf(r) + 1
          return `  ${String(idx).padStart(3, " ")}  ${r.title} — ${r.artist}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      if (currentDirectory === "~/hardware") {
        const results = hardwareData.filter(
          (d) => d.name.toLowerCase().includes(term) || d.type.toLowerCase().includes(term),
        )
        if (results.length === 0) return `No results for "${term}"`
        const list = results.map((d) => {
          const idx = hardwareData.indexOf(d) + 1
          return `  ${String(idx).padStart(3, " ")}  ${d.name} (${d.type})`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      if (currentDirectory === "~/books") {
        const results = booksData.filter(
          (b) => {
            const authorStr = Array.isArray(b.author) ? b.author.join(", ") : b.author
            return b.title.toLowerCase().includes(term) || authorStr.toLowerCase().includes(term)
          },
        )
        if (results.length === 0) return `No results for "${term}"`
        const list = results.map((b) => {
          const idx = booksData.indexOf(b) + 1
          return `  ${String(idx).padStart(3, " ")}  ${b.title} — ${b.author}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      return "search: not in a collection directory"
    },
    genre: (args) => {
      const genreName = args.join(" ").toLowerCase()

      if (currentDirectory === "~/vinyl") {
        if (!genreName) {
          const genres = [...new Set(vinylData.map((r) => r.genre))].sort()
          return ["", ...genres.map((g) => `  ${g}`), ""]
        }
        const results = vinylData.filter((r) => r.genre.toLowerCase().includes(genreName))
        if (results.length === 0) return `No records in genre "${genreName}"`
        const list = results.map((r) => {
          const idx = vinylData.indexOf(r) + 1
          return `  ${String(idx).padStart(3, " ")}  ${r.title} — ${r.artist}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      if (currentDirectory === "~/books") {
        if (!genreName) {
          const genres = [...new Set(booksData.map((b) => b.genre))].sort()
          return ["", ...genres.map((g) => `  ${g}`), ""]
        }
        const results = booksData.filter((b) => b.genre.toLowerCase().includes(genreName))
        if (results.length === 0) return `No books in genre "${genreName}"`
        const list = results.map((b) => {
          const idx = booksData.indexOf(b) + 1
          return `  ${String(idx).padStart(3, " ")}  ${b.title} — ${b.author}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      return "genre: only available in ~/books or ~/vinyl"
    },
    format: (args) => {
      const formatType = args.join(" ").toLowerCase()

      if (currentDirectory === "~/vinyl") {
        if (!formatType) {
          const formats = [...new Set(vinylData.map((r) => r.format))].sort()
          return ["", ...formats.map((f) => `  ${f}`), ""]
        }
        const results = vinylData.filter((r) => r.format.toLowerCase().includes(formatType))
        if (results.length === 0) return `No records in format "${formatType}"`
        const list = results.map((r) => {
          const idx = vinylData.indexOf(r) + 1
          return `  ${String(idx).padStart(3, " ")}  ${r.title} — ${r.artist}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      if (currentDirectory === "~/books") {
        if (!formatType) {
          const formats = [...new Set(booksData.map((b) => b.format))].sort()
          return ["", ...formats.map((f) => `  ${f}`), ""]
        }
        const results = booksData.filter((b) => b.format.toLowerCase().includes(formatType))
        if (results.length === 0) return `No books in format "${formatType}"`
        const list = results.map((b) => {
          const idx = booksData.indexOf(b) + 1
          return `  ${String(idx).padStart(3, " ")}  ${b.title} — ${b.author}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      return "format: only available in ~/books or ~/vinyl"
    },
    type: (args) => {
      if (currentDirectory !== "~/hardware") {
        return "type: only available in ~/hardware"
      }
      const typeName = args.join(" ").toLowerCase()
      if (!typeName) {
        const types = [...new Set(hardwareData.map((d) => d.type))].sort()
        return ["", ...types.map((t) => `  ${t}`), ""]
      }
      const results = hardwareData.filter((d) => d.type.toLowerCase().includes(typeName))
      if (results.length === 0) return `No devices of type "${typeName}"`
      const list = results.map((d) => {
        const idx = hardwareData.indexOf(d) + 1
        return `  ${String(idx).padStart(3, " ")}  ${d.name}`
      })
      return ["", `${results.length} results`, "", ...list, ""]
    },
    clear: () => {
      setHistory([
        { type: "output", content: "" },
        { type: "success", content: "zachary@home" },
        { type: "output", content: "" },
        { type: "output", content: "Type 'help' for available commands." },
        { type: "output", content: "" },
      ])
      return ""
    },
    whoami: () => "zachary",
    date: () => new Date().toLocaleString(),
    echo: (args) => args.join(" ") || "",
    game: (args) => {
      const gameType = args[0]?.toLowerCase()
      if (!gameType) {
        return [
          "",
          "  game number      Guess the number",
          "  game wordle      Guess the 5-letter word",
          "  game trivia      Answer trivia questions",
          "  game blackjack   Play 21 against dealer",
          "  game rps         Rock Paper Scissors",
          "",
        ]
      }

      if (gameType === "number") return startNumberGame()
      if (gameType === "wordle") return startWordleGame()
      if (gameType === "trivia") return startTriviaGame()
      if (gameType === "blackjack") return startBlackjackGame()
      if (gameType === "rps") return startRPSGame()

      return `Unknown game: ${gameType}`
    },
    neofetch: () => [
      "",
      "  zachary@home",
      "  ------------",
      `  Theme: ${themes[currentTheme].name}`,
      `  Font: ${fonts[currentFont].name}`,
      "  Shell: web/1.0",
      "  Terminal: browser",
      `  Books: ${booksData.length}`,
      `  Vinyl: ${vinylData.length}`,
      `  Hardware: ${hardwareData.length}`,
      "",
    ],
    cat: (args) => `cat: ${args[0] || "file"}: No such file`,
    sudo: () => "Permission denied",
    exit: () => "Use Cmd+W or Ctrl+W to close",
  }

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    setHistory((prev) => [...prev, { type: "input", content: `${currentDirectory} $ ${trimmedCmd}` }])

    if (gameState.active) {
      let result: string | (string | { wordle: string })[]
      if (gameState.type === "number") {
        result = handleNumberGame(trimmedCmd)
      } else if (gameState.type === "wordle") {
        result = handleWordleGame(trimmedCmd)
      } else if (gameState.type === "trivia") {
        result = handleTriviaGame(trimmedCmd)
      } else if (gameState.type === "blackjack") {
        result = handleBlackjackGame(trimmedCmd)
      } else if (gameState.type === "rps") {
        result = handleRPSGame(trimmedCmd)
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

    setCommandHistory((prev) => [...prev, trimmedCmd])
    setHistoryIndex(-1)

    const [command, ...args] = trimmedCmd.split(" ")
    const cmd_lower = command.toLowerCase()

    if (commands[cmd_lower]) {
      const result = commands[cmd_lower](args)
      if (result) {
        const items = Array.isArray(result) ? result : [result]
        items.forEach((item) => {
          if (typeof item === "object" && item.href) {
            setHistory((prev) => [
              ...prev,
              { type: "link", content: item.text, href: item.href },
            ])
          } else {
            const line = typeof item === "string" ? item : item.text
            setHistory((prev) => [
              ...prev,
              {
                type: line.startsWith("Permission") || line.includes("No such") || line.includes("not in") ? "error" : "output",
                content: line,
              },
            ])
          }
        })
      }
    } else {
      setHistory((prev) => [
        ...prev,
        { type: "error", content: `command not found: ${command}` },
      ])
    }

    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input)
    } else if (e.key === "Tab") {
      e.preventDefault()
      const completions = getCompletions(input)
      if (completions.length === 1) {
        const parts = input.split(" ")
        if (parts.length === 1) {
          setInput(completions[0])
        } else {
          parts[parts.length - 1] = completions[0]
          setInput(parts.join(" "))
        }
      } else if (completions.length > 1) {
        setHistory((prev) => [
          ...prev,
          { type: "input", content: `${currentDirectory} $ ${input}` },
          { type: "output", content: completions.join("  ") },
        ])
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput("")
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault()
      setHistory([
        { type: "output", content: "" },
        { type: "success", content: "zachary@home" },
        { type: "output", content: "" },
        { type: "output", content: "Type 'help' for available commands." },
        { type: "output", content: "" },
      ])
    }
  }

  return (
    <div
      className="h-full w-full bg-background p-4 md:p-6 font-mono text-sm md:text-base cursor-text flex flex-col"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={terminalRef} className="flex-1 overflow-y-auto">
        {history.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap ${
              line.type === "input"
                ? "text-primary"
                : line.type === "error"
                  ? "text-destructive"
                  : line.type === "success"
                    ? "text-accent"
                    : line.type === "link"
                      ? "text-foreground"
                      : "text-foreground"
            }`}
          >
            {line.type === "link" && line.href ? (
              <a
                href={line.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {line.content}
              </a>
            ) : line.type === "wordle" ? (
              <span className="font-mono tracking-widest">
                {line.content.split(",").map((pair, idx) => {
                  const [mark, letter] = pair.split(":")
                  const colorClass = mark === "X"
                    ? "text-green-400"
                    : mark === "?"
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                  return (
                    <span key={idx} className={`${colorClass} font-bold`}>
                      {letter}
                    </span>
                  )
                })}
              </span>
            ) : (
              line.content
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-primary">{gameState.active ? `[${gameState.type}]` : `${currentDirectory} $`}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  )
}
