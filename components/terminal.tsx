"use client"

import type React from "react"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface TerminalLine {
  type: "input" | "output" | "error" | "success"
  content: string
}

interface GameState {
  active: boolean
  type: "number" | "hack" | "rps" | null
  data?: any
}

export function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: "success", content: "SYSTEM_ONLINE | Type 'help' for available commands" },
  ])
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [gameState, setGameState] = useState<GameState>({ active: false, type: null })
  const [currentDirectory, setCurrentDirectory] = useState("~")
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (gameState.active) {
          e.preventDefault()
          setHistory((prev) => [...prev, { type: "output", content: "^C" }])
          setHistory((prev) => [...prev, { type: "output", content: "Game interrupted. Returning to terminal..." }])
          setGameState({ active: false, type: null })
          setInput("")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState.active])

  const startNumberGame = () => {
    const target = Math.floor(Math.random() * 100) + 1
    setGameState({ active: true, type: "number", data: { target, attempts: 0 } })
    return [
      "=== NUMBER GUESSING GAME ===",
      "I'm thinking of a number between 1 and 100.",
      "Can you guess it? (Type 'quit' to exit)",
    ]
  }

  const handleNumberGame = (guess: string) => {
    if (guess.toLowerCase() === "quit") {
      setGameState({ active: false, type: null })
      return "Game ended. Thanks for playing!"
    }

    const num = Number.parseInt(guess)
    if (isNaN(num)) {
      return "Please enter a valid number!"
    }

    const attempts = gameState.data.attempts + 1
    const target = gameState.data.target

    if (num === target) {
      setGameState({ active: false, type: null })
      return [
        `🎉 CORRECT! You guessed it in ${attempts} attempts!`,
        `The number was ${target}.`,
        "Type 'game number' to play again!",
      ]
    } else if (num < target) {
      setGameState({ ...gameState, data: { ...gameState.data, attempts } })
      return `Too low! Try again. (Attempt ${attempts})`
    } else {
      setGameState({ ...gameState, data: { ...gameState.data, attempts } })
      return `Too high! Try again. (Attempt ${attempts})`
    }
  }

  const startHackGame = () => {
    const code = Math.floor(Math.random() * 9000) + 1000
    setGameState({ active: true, type: "hack", data: { code, attempts: 0, maxAttempts: 5 } })
    return [
      "=== HACK THE MAINFRAME ===",
      "SECURITY BREACH DETECTED!",
      "You need to crack the 4-digit access code.",
      `You have ${5} attempts before lockout.`,
      "Guess the code: (Type 'quit' to exit)",
    ]
  }

  const handleHackGame = (guess: string) => {
    if (guess.toLowerCase() === "quit") {
      setGameState({ active: false, type: null })
      return "Connection terminated. Exiting hack sequence..."
    }

    const num = Number.parseInt(guess)
    if (isNaN(num) || guess.length !== 4) {
      return "ERROR: Invalid code format. Enter a 4-digit number."
    }

    const attempts = gameState.data.attempts + 1
    const code = gameState.data.code
    const maxAttempts = gameState.data.maxAttempts

    if (num === code) {
      setGameState({ active: false, type: null })
      return [
        "ACCESS GRANTED!",
        "[████████████████████] 100%",
        "🔓 MAINFRAME UNLOCKED",
        `Code cracked in ${attempts} attempts!`,
        "You're in the system now...",
      ]
    } else {
      const remaining = maxAttempts - attempts
      if (remaining <= 0) {
        setGameState({ active: false, type: null })
        return [
          "🚨 LOCKOUT INITIATED 🚨",
          "Too many failed attempts!",
          `The code was: ${code}`,
          "System locked. Type 'game hack' to try again.",
        ]
      }

      const diff = Math.abs(num - code)
      let hint = ""
      if (diff < 100) hint = "VERY CLOSE!"
      else if (diff < 500) hint = "Getting warmer..."
      else if (diff < 1000) hint = "Cold..."
      else hint = "Very cold!"

      setGameState({ ...gameState, data: { ...gameState.data, attempts } })
      return [`DENIED. ${hint}`, `Attempts remaining: ${remaining}`]
    }
  }

  const startRPSGame = () => {
    setGameState({ active: true, type: "rps", data: { score: { player: 0, computer: 0 } } })
    return [
      "=== ROCK PAPER SCISSORS ===",
      "Choose: rock, paper, or scissors",
      "Type 'quit' to exit",
      "Score: You 0 - 0 Computer",
    ]
  }

  const handleRPSGame = (choice: string) => {
    const normalized = choice.toLowerCase().trim()

    if (normalized === "quit") {
      const score = gameState.data.score
      setGameState({ active: false, type: null })
      return [`Game Over! Final Score: You ${score.player} - ${score.computer} Computer`, "Thanks for playing!"]
    }

    if (!["rock", "paper", "scissors"].includes(normalized)) {
      return "Invalid choice! Choose: rock, paper, or scissors"
    }

    const choices = ["rock", "paper", "scissors"]
    const computerChoice = choices[Math.floor(Math.random() * 3)]

    let result = ""
    const newScore = { ...gameState.data.score }

    if (normalized === computerChoice) {
      result = "It's a tie!"
    } else if (
      (normalized === "rock" && computerChoice === "scissors") ||
      (normalized === "paper" && computerChoice === "rock") ||
      (normalized === "scissors" && computerChoice === "paper")
    ) {
      result = "You win this round!"
      newScore.player++
    } else {
      result = "Computer wins this round!"
      newScore.computer++
    }

    setGameState({ ...gameState, data: { score: newScore } })

    return [
      `You chose: ${normalized}`,
      `Computer chose: ${computerChoice}`,
      result,
      `Score: You ${newScore.player} - ${newScore.computer} Computer`,
      "",
      "Choose again: rock, paper, or scissors",
    ]
  }

  const commands: Record<string, (args: string[]) => string | string[]> = {
    help: () => {
      if (currentDirectory === "~/books") {
        return [
          "BOOK LIBRARY COMMANDS:",
          "  ls            - List all books",
          "  search [term] - Search books by title or author",
          "  genre [name]  - Filter books by genre (or list all genres)",
          "  format [type] - Filter books by format (or list all formats)",
          "  cd ..         - Go back to home directory",
          "  clear         - Clear terminal",
        ]
      }
      if (currentDirectory === "~/vinyl") {
        return [
          "VINYL COLLECTION COMMANDS:",
          "  ls            - List all vinyl records",
          "  search [term] - Search records by title or artist",
          "  genre [name]  - Filter records by genre (or list all genres)",
          "  format [type] - Filter records by format (or list all formats)",
          "  cd ..         - Go back to home directory",
          "  clear         - Clear terminal",
        ]
      }
      if (currentDirectory === "~/hardware") {
        return [
          "HARDWARE COLLECTION COMMANDS:",
          "  ls            - List all hardware devices",
          "  search [term] - Search devices by name or type",
          "  type [name]   - Filter devices by type (or list all types)",
          "  cd ..         - Go back to home directory",
          "  clear         - Clear terminal",
        ]
      }
      return [
        "AVAILABLE COMMANDS:",
        "  help          - Show this help message",
        "  ls            - List files and directories",
        "  cd [dir]      - Change directory",
        "  pwd           - Print working directory",
        "  about         - Display information about Zachary",
        "  contact       - Show contact information",
        "  clear         - Clear terminal",
        "  whoami        - Display current user",
        "  date          - Show current date/time",
        "  echo [text]   - Echo text back",
        "  game [type]   - Play a game (number, hack, rps)",
      ]
    },
    ls: () => {
      if (currentDirectory === "~/books") {
        const bookList = booksData.map(
          (book, i) => `  ${String(i + 1).padStart(3, " ")}. ${book.title} - ${book.author}`,
        )
        return [`BOOK LIBRARY (${booksData.length} books):`, "", ...bookList]
      } else if (currentDirectory === "~/vinyl") {
        const vinylList = vinylData.map(
          (record, i) => `  ${String(i + 1).padStart(3, " ")}. ${record.title} - ${record.artist}`,
        )
        return [`VINYL COLLECTION (${vinylData.length} records):`, "", ...vinylList]
      } else if (currentDirectory === "~/hardware") {
        const hardwareList = hardwareData.map(
          (device, i) => `  ${String(i + 1).padStart(3, " ")}. ${device.name} - ${device.type} [${device.status}]`,
        )
        return [`HARDWARE COLLECTION (${hardwareData.length} devices):`, "", ...hardwareList]
      } else if (currentDirectory === "~/games") {
        return [
          "GAMES DIRECTORY:",
          "  number        - Guess the number (1-100)",
          "  hack          - Crack the mainframe code",
          "  rps           - Rock Paper Scissors",
          "",
          "Run with: game [type]",
        ]
      }
      return [
        "DIRECTORIES:",
        "  projects/     - View my GitHub projects",
        "  writing/      - Read my blog posts",
        "  books/        - Browse my book library",
        "  vinyl/        - Explore my vinyl collection",
        "  hardware/     - View my hardware collection",
        "  about/        - Learn more about me",
        "  contact/      - Get in touch",
        "  games/        - Play terminal games",
      ]
    },
    cd: (args) => {
      const dir = args[0]?.toLowerCase().replace("/", "")

      if (dir === ".." || dir === "../") {
        setCurrentDirectory("~")
        return "Changed directory to ~"
      }

      if (!dir || dir === "~" || dir === "home") {
        setCurrentDirectory("~")
        return "Changed directory to ~"
      }

      const validDirs = ["projects", "writing", "books", "vinyl", "hardware", "about", "contact", "games"]

      if (validDirs.includes(dir)) {
        if (dir === "books") {
          setCurrentDirectory("~/books")
          return ["Changed directory to ~/books", "Type 'ls' to see all books, or 'help' for available commands"]
        } else if (dir === "vinyl") {
          setCurrentDirectory("~/vinyl")
          return ["Changed directory to ~/vinyl", "Type 'ls' to see all records, or 'help' for available commands"]
        } else if (dir === "hardware") {
          setCurrentDirectory("~/hardware")
          return ["Changed directory to ~/hardware", "Type 'ls' to see all devices, or 'help' for available commands"]
        } else if (dir === "games") {
          setCurrentDirectory("~/games")
          return ["Changed directory to ~/games", "Type 'ls' to see available games"]
        } else if (dir === "projects") {
          window.open("https://github.com/zacblev1", "_blank")
          return "Opening projects in new tab..."
        } else {
          router.push(`/${dir}`)
          return `Navigating to ${dir}...`
        }
      }

      return `cd: ${dir}: No such directory`
    },
    pwd: () => {
      return `/home/zachary/portfolio/${currentDirectory === "~" ? "" : currentDirectory.replace("~/", "")}`
    },
    about: () => [
      "ZACHARY | CREATIVE_TECHNOLOGIST",
      "",
      "Focused on intentional design, sustainable systems, and quiet utility.",
      "Building digital experiences that are thoughtful, accessible, and built to last.",
      "",
      "When not coding: exploring, reading, analog photography.",
    ],
    contact: () => ["CONTACT_INFO:", "", "Email: hello@zachary.com", "GitHub: github.com/zacblev1"],
    projects: () => {
      window.open("https://github.com/zacblev1", "_blank")
      return "Opening GitHub projects..."
    },
    search: (args) => {
      if (currentDirectory === "~/vinyl") {
        const term = args.join(" ").toLowerCase()
        if (!term) {
          return "Usage: search [term] - Search records by title or artist"
        }
        const results = vinylData.filter(
          (record) => record.title.toLowerCase().includes(term) || record.artist.toLowerCase().includes(term),
        )
        if (results.length === 0) {
          return `No records found matching: ${term}`
        }
        const resultList = results.map((record) => `  • ${record.title} - ${record.artist} [${record.genre}]`)
        return [`Found ${results.length} record(s):`, "", ...resultList]
      }
      if (currentDirectory === "~/hardware") {
        const term = args.join(" ").toLowerCase()
        if (!term) {
          return "Usage: search [term] - Search devices by name or type"
        }
        const results = hardwareData.filter(
          (device) => device.name.toLowerCase().includes(term) || device.type.toLowerCase().includes(term),
        )
        if (results.length === 0) {
          return `No devices found matching: ${term}`
        }
        const resultList = results.map((device) => `  • ${device.name} - ${device.type} [${device.status}]`)
        return [`Found ${results.length} device(s):`, "", ...resultList]
      }
      if (currentDirectory !== "~/books") {
        return "ERROR: search command only available in ~/books, ~/vinyl, or ~/hardware directory."
      }
      const term = args.join(" ").toLowerCase()
      if (!term) {
        return "Usage: search [term] - Search books by title or author"
      }
      const results = booksData.filter(
        (book) => book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term),
      )
      if (results.length === 0) {
        return `No books found matching: ${term}`
      }
      const resultList = results.map((book) => `  • ${book.title} - ${book.author} [${book.genre}]`)
      return [`Found ${results.length} book(s):`, "", ...resultList]
    },
    genre: (args) => {
      if (currentDirectory === "~/vinyl") {
        const genreName = args.join(" ").toLowerCase()
        if (!genreName) {
          const genres = [...new Set(vinylData.map((record) => record.genre))].sort()
          return ["Available genres:", "", ...genres.map((g) => `  • ${g}`)]
        }
        const results = vinylData.filter((record) => record.genre.toLowerCase().includes(genreName))
        if (results.length === 0) {
          return `No records found in genre: ${genreName}`
        }
        const resultList = results.map((record) => `  • ${record.title} - ${record.artist}`)
        return [`${results.length} record(s) in ${genreName}:`, "", ...resultList]
      }
      if (currentDirectory !== "~/books") {
        return "ERROR: genre command only available in ~/books or ~/vinyl directory."
      }
      const genreName = args.join(" ").toLowerCase()
      if (!genreName) {
        const genres = [...new Set(booksData.map((book) => book.genre))].sort()
        return ["Available genres:", "", ...genres.map((g) => `  • ${g}`)]
      }
      const results = booksData.filter((book) => book.genre.toLowerCase().includes(genreName))
      if (results.length === 0) {
        return `No books found in genre: ${genreName}`
      }
      const resultList = results.map((book) => `  • ${book.title} - ${book.author}`)
      return [`${results.length} book(s) in ${genreName}:`, "", ...resultList]
    },
    format: (args) => {
      if (currentDirectory === "~/vinyl") {
        const formatType = args.join(" ").toLowerCase()
        if (!formatType) {
          const formats = [...new Set(vinylData.map((record) => record.format))].sort()
          return ["Available formats:", "", ...formats.map((f) => `  • ${f}`)]
        }
        const results = vinylData.filter((record) => record.format.toLowerCase().includes(formatType))
        if (results.length === 0) {
          return `No records found in format: ${formatType}`
        }
        const resultList = results.map((record) => `  • ${record.title} - ${record.artist} [${record.format}]`)
        return [`${results.length} record(s) in ${formatType} format:`, "", ...resultList]
      }
      if (currentDirectory !== "~/books") {
        return "ERROR: format command only available in ~/books or ~/vinyl directory."
      }
      const formatType = args.join(" ").toLowerCase()
      if (!formatType) {
        const formats = [...new Set(booksData.map((book) => book.format))].sort()
        return ["Available formats:", "", ...formats.map((f) => `  • ${f}`)]
      }
      const results = booksData.filter((book) => book.format.toLowerCase().includes(formatType))
      if (results.length === 0) {
        return `No books found in format: ${formatType}`
      }
      const resultList = results.map((book) => `  • ${book.title} - ${book.author} [${book.format}]`)
      return [`${results.length} book(s) in ${formatType} format:`, "", ...resultList]
    },
    clear: () => {
      setHistory([])
      return ""
    },
    whoami: () => "zachary",
    date: () => new Date().toString(),
    echo: (args) => args.join(" ") || "",
    game: (args) => {
      const gameType = args[0]?.toLowerCase()
      if (!gameType) {
        return [
          "Available games:",
          "  game number  - Guess the number (1-100)",
          "  game hack    - Crack the mainframe code",
          "  game rps     - Rock Paper Scissors",
        ]
      }

      if (gameType === "number") {
        return startNumberGame()
      } else if (gameType === "hack") {
        return startHackGame()
      } else if (gameType === "rps") {
        return startRPSGame()
      } else {
        return `Unknown game: ${gameType}. Try 'game' to see available games.`
      }
    },
    matrix: () => ["Wake up, Neo...", "The Matrix has you...", "Follow the white rabbit.", "", "Knock, knock, Neo."],
    hack: () => [
      "INITIATING HACK SEQUENCE...",
      "[████████████████████] 100%",
      "",
      "ACCESS GRANTED",
      "Just kidding. This isn't that kind of terminal 😎",
      "",
      "...or is it? Try 'game hack' for a real challenge.",
    ],
    coffee: () => [
      "      (",
      "       )     (",
      "  ___...(-------)-....___",
      ' .-""       )    (          ""-.',
      " .-''''|-._.-._.-._.-._.-._.-'|",
      " |  .--'  Coffee.exe loaded  '--. |",
      " | /  ☕ Brewing digital coffee  \\ |",
      " |/                              \\|",
      "",
      "Your coffee is ready! ☕",
    ],
    sudo: () => "Nice try. You already have all the permissions you need here.",
    exit: () => "There is no escape. Just kidding - close the browser tab if you want to leave!",
    cat: (args) => {
      if (args[0] === "welcome.txt") {
        return "Hi, I'm Zachary - welcome to my digital space!"
      }
      return `cat: ${args[0] || "file"}: No such file or directory`
    },
    type: (args) => {
      if (currentDirectory !== "~/hardware") {
        return "ERROR: type command only available in ~/hardware directory."
      }
      const typeName = args.join(" ").toLowerCase()
      if (!typeName) {
        const types = [...new Set(hardwareData.map((device) => device.type))].sort()
        return ["Available types:", "", ...types.map((t) => `  • ${t}`)]
      }
      const results = hardwareData.filter((device) => device.type.toLowerCase().includes(typeName))
      if (results.length === 0) {
        return `No devices found of type: ${typeName}`
      }
      const resultList = results.map((device) => `  • ${device.name} - ${device.processor}`)
      return [`${results.length} device(s) of type ${typeName}:`, "", ...resultList]
    },
  }

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    setHistory((prev) => [...prev, { type: "input", content: `$ ${trimmedCmd}` }])

    if (gameState.active) {
      let result: string | string[]
      if (gameState.type === "number") {
        result = handleNumberGame(trimmedCmd)
      } else if (gameState.type === "hack") {
        result = handleHackGame(trimmedCmd)
      } else if (gameState.type === "rps") {
        result = handleRPSGame(trimmedCmd)
      } else {
        result = "Error: Unknown game state"
      }

      const lines = Array.isArray(result) ? result : [result]
      lines.forEach((line) => {
        setHistory((prev) => [...prev, { type: "output", content: line }])
      })
      setInput("")
      return
    }

    setCommandHistory((prev) => [...prev, trimmedCmd])
    setHistoryIndex(-1)

    const [command, ...args] = trimmedCmd.toLowerCase().split(" ")

    if (commands[command]) {
      const result = commands[command](args)
      if (result) {
        const lines = Array.isArray(result) ? result : [result]
        lines.forEach((line) => {
          setHistory((prev) => [
            ...prev,
            {
              type: line.startsWith("ERROR") ? "error" : "output",
              content: line,
            },
          ])
        })
      }
    } else {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          content: `Command not found: ${command}. Type 'help' for available commands.`,
        },
      ])
    }

    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input)
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
    }
  }

  return (
    <div
      className="border border-primary/30 bg-card/50 p-4 font-mono text-sm cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
        <span className="text-accent">●</span>
        <span className="text-secondary">●</span>
        <span className="text-destructive">●</span>
        <span className="ml-2 text-primary text-xs">TERMINAL v1.0</span>
      </div>

      <div ref={terminalRef} className="max-h-[300px] overflow-y-auto mb-2 space-y-1">
        {history.map((line, i) => (
          <div
            key={i}
            className={`${
              line.type === "input"
                ? "text-primary"
                : line.type === "error"
                  ? "text-destructive"
                  : line.type === "success"
                    ? "text-accent"
                    : "text-muted-foreground"
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-primary">
          {gameState.active ? `[${gameState.type?.toUpperCase()}]` : `user@portfolio:${currentDirectory}$`}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground"
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
