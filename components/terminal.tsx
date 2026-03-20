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
import { themes, fonts, GAME_NAMES, type ThemeName, type FontName } from "@/lib/terminal-config"
import { HistoryDisplay, InputLine, type InputLineHandle, VALID_COMMANDS } from "./terminal/index"
import { useTerminalContext } from '@/lib/terminal-context'
import { useSound } from '@/lib/hooks/useSound'
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

interface GameState {
  active: boolean
  type: "number" | "wordle" | "trivia" | "blackjack" | "rps" | "tron" | "pacman" | "basketball" | "suggest" | null
  data?: Record<string, unknown>
}

const manPages: Record<string, string[]> = {
  man: [
    "",
    "NAME",
    "    man - display manual pages",
    "",
    "SYNOPSIS",
    "    man [command]",
    "",
    "DESCRIPTION",
    "    Display detailed documentation for terminal commands.",
    "    Without arguments, lists all available manual pages.",
    "",
    "EXAMPLES",
    "    man ls        View documentation for ls",
    "    man game      Learn about available games",
    "",
  ],
  ls: [
    "",
    "NAME",
    "    ls - list directory contents",
    "",
    "SYNOPSIS",
    "    ls [path]",
    "",
    "DESCRIPTION",
    "    List files and directories in the current or specified",
    "    directory. Use with cd to navigate the file system.",
    "",
    "EXAMPLES",
    "    ls            List current directory",
    "    ls books      List contents of books directory",
    "",
    "SEE ALSO",
    "    cd, pwd, cat",
    "",
  ],
  cd: [
    "",
    "NAME",
    "    cd - change directory",
    "",
    "SYNOPSIS",
    "    cd [directory]",
    "",
    "DESCRIPTION",
    "    Change the current working directory. Use ~ for home,",
    "    .. for parent directory, or specify a path.",
    "",
    "EXAMPLES",
    "    cd books      Navigate to books",
    "    cd ..         Go up one level",
    "    cd ~          Return home",
    "",
    "SEE ALSO",
    "    ls, pwd",
    "",
  ],
  pwd: [
    "",
    "NAME",
    "    pwd - print working directory",
    "",
    "SYNOPSIS",
    "    pwd",
    "",
    "DESCRIPTION",
    "    Display the full path of the current directory.",
    "",
  ],
  cat: [
    "",
    "NAME",
    "    cat - display file contents",
    "",
    "SYNOPSIS",
    "    cat <file>",
    "",
    "DESCRIPTION",
    "    Display the raw contents of a file. For formatted",
    "    output of collection items, use 'view' instead.",
    "",
    "SEE ALSO",
    "    view",
    "",
  ],
  view: [
    "",
    "NAME",
    "    view - display formatted file contents",
    "",
    "SYNOPSIS",
    "    view <file>",
    "",
    "DESCRIPTION",
    "    Display file contents with nice formatting. Works best",
    "    with collection items in ~/books, ~/vinyl, ~/hardware,",
    "    and blog posts in ~/notes.",
    "",
    "EXAMPLES",
    "    cd books",
    "    view dune",
    "    cd ~/notes",
    "    view welcome-young-explorers-",
    "",
    "SEE ALSO",
    "    cat, ls",
    "",
  ],
  search: [
    "",
    "NAME",
    "    search - search within collections",
    "",
    "SYNOPSIS",
    "    search <term>",
    "",
    "DESCRIPTION",
    "    Search the current collection for items matching the",
    "    given term. Searches titles and authors/artists.",
    "    Must be in ~/books, ~/vinyl, ~/hardware, or ~/notes.",
    "",
    "EXAMPLES",
    "    cd vinyl",
    "    search daft punk",
    "    cd ~/notes",
    "    search welcome",
    "",
    "SEE ALSO",
    "    genre, format, type",
    "",
  ],
  genre: [
    "",
    "NAME",
    "    genre - filter by genre",
    "",
    "SYNOPSIS",
    "    genre [name]",
    "",
    "DESCRIPTION",
    "    Without arguments, lists all genres in the collection.",
    "    With a genre name, shows items matching that genre.",
    "    Works in ~/books and ~/vinyl.",
    "",
    "EXAMPLES",
    "    genre              List all genres",
    "    genre rock         Show rock albums",
    "",
    "SEE ALSO",
    "    search, format",
    "",
  ],
  format: [
    "",
    "NAME",
    "    format - filter by format",
    "",
    "SYNOPSIS",
    "    format [type]",
    "",
    "DESCRIPTION",
    "    Without arguments, lists all formats in the collection.",
    "    With a format type, shows items in that format.",
    "    Works in ~/books and ~/vinyl.",
    "",
    "EXAMPLES",
    "    format             List all formats",
    "    format hardcover   Show hardcover books",
    "",
    "SEE ALSO",
    "    search, genre",
    "",
  ],
  type: [
    "",
    "NAME",
    "    type - filter hardware by type",
    "",
    "SYNOPSIS",
    "    type [name]",
    "",
    "DESCRIPTION",
    "    Without arguments, lists all hardware types.",
    "    With a type name, shows devices of that type.",
    "    Only works in ~/hardware.",
    "",
    "EXAMPLES",
    "    type               List all types",
    "    type laptop        Show laptops",
    "",
    "SEE ALSO",
    "    search",
    "",
  ],
  game: [
    "",
    "NAME",
    "    game - play terminal games",
    "",
    "SYNOPSIS",
    "    game <type>",
    "",
    "DESCRIPTION",
    "    Launch a terminal game. Press Ctrl+C to quit any game.",
    "",
    "GAMES",
    "    number      Guess a number between 1-100",
    "    wordle      Guess the 5-letter word in 6 tries",
    "    trivia      Answer 5 trivia questions",
    "    blackjack   Play 21 against the dealer",
    "    rps         Rock Paper Scissors",
    "    tron        Light Cycle Arcade Game",
    "    pacman      Classic Maze Chase",
    "    basketball  Arcade Hoops",
    "",
    "EXAMPLES",
    "    game wordle",
    "    game pacman",
    "",
  ],
  notes: [
    "",
    "NAME",
    "    notes - read blog posts and updates",
    "",
    "SYNOPSIS",
    "    notes [number]",
    "",
    "DESCRIPTION",
    "    View blog posts and site updates. Without arguments,",
    "    displays a numbered list of available notes. With a",
    "    number, displays that note.",
    "",
    "EXAMPLES",
    "    notes        List all notes",
    "    notes 1      Read the first note",
    "",
    "SEE ALSO",
    "    view, cat",
    "",
  ],
  suggest: [
    "",
    "NAME",
    "    suggest - submit a game suggestion",
    "",
    "SYNOPSIS",
    "    suggest",
    "",
    "DESCRIPTION",
    "    Opens an interactive prompt to submit a game idea or",
    "    suggestion. Your suggestion will be sent via email.",
    "    Type 'cancel' to exit without submitting.",
    "",
    "EXAMPLES",
    "    suggest",
    "    > A multiplayer snake game",
    "",
    "SEE ALSO",
    "    game",
    "",
  ],
  theme: [
    "",
    "NAME",
    "    theme - change terminal color theme",
    "",
    "SYNOPSIS",
    "    theme [name]",
    "",
    "DESCRIPTION",
    "    Without arguments, lists available themes.",
    "    With a theme name, applies that theme.",
    "    Theme preference is saved to localStorage.",
    "",
    "THEMES",
    "    lumon, tokyonight, dracula, gruvbox, nord, monokai",
    "",
    "EXAMPLES",
    "    theme              List themes",
    "    theme dracula      Apply Dracula theme",
    "",
    "SEE ALSO",
    "    font, neofetch",
    "",
  ],
  font: [
    "",
    "NAME",
    "    font - change terminal font",
    "",
    "SYNOPSIS",
    "    font [name]",
    "",
    "DESCRIPTION",
    "    Without arguments, lists available fonts.",
    "    With a font name, applies that font.",
    "    Font preference is saved to localStorage.",
    "",
    "FONTS",
    "    jetbrains, fira, source, ibm, hack, mono",
    "",
    "EXAMPLES",
    "    font               List fonts",
    "    font fira          Apply Fira Code",
    "",
    "SEE ALSO",
    "    theme, neofetch",
    "",
  ],
  sound: [
    "",
    "NAME",
    "    sound - toggle sound effects",
    "",
    "SYNOPSIS",
    "    sound [on|off]",
    "",
    "DESCRIPTION",
    "    Enable or disable retro sound effects. When enabled, plays",
    "    keyclick sounds on typing, beeps on errors, and chimes on",
    "    success. Sound preference is saved to localStorage.",
    "    Without arguments, displays current sound state.",
    "",
    "EXAMPLES",
    "    sound on        Enable sound effects",
    "    sound off       Disable sound effects",
    "    sound           Show current state",
    "",
  ],
  neofetch: [
    "",
    "NAME",
    "    neofetch - display system information",
    "",
    "SYNOPSIS",
    "    neofetch",
    "",
    "DESCRIPTION",
    "    Display terminal configuration and collection stats",
    "    in the style of the classic neofetch utility.",
    "",
  ],
  mkdir: [
    "",
    "NAME",
    "    mkdir - create directory",
    "",
    "SYNOPSIS",
    "    mkdir <name>",
    "",
    "DESCRIPTION",
    "    Create a new directory in the current location.",
    "",
    "SEE ALSO",
    "    touch, rm, ls",
    "",
  ],
  touch: [
    "",
    "NAME",
    "    touch - create empty file",
    "",
    "SYNOPSIS",
    "    touch <name>",
    "",
    "DESCRIPTION",
    "    Create a new empty file in the current location.",
    "",
    "SEE ALSO",
    "    mkdir, rm, cat",
    "",
  ],
  rm: [
    "",
    "NAME",
    "    rm - remove file or directory",
    "",
    "SYNOPSIS",
    "    rm <path>",
    "",
    "DESCRIPTION",
    "    Remove a file or empty directory.",
    "",
    "SEE ALSO",
    "    mkdir, touch",
    "",
  ],
  about: [
    "",
    "NAME",
    "    about - about the author",
    "",
    "SYNOPSIS",
    "    about",
    "",
    "DESCRIPTION",
    "    Display information about Zachary.",
    "",
    "SEE ALSO",
    "    contact, projects",
    "",
  ],
  contact: [
    "",
    "NAME",
    "    contact - contact information",
    "",
    "SYNOPSIS",
    "    contact",
    "",
    "DESCRIPTION",
    "    Display email and social links.",
    "",
    "SEE ALSO",
    "    about, projects",
    "",
  ],
  projects: [
    "",
    "NAME",
    "    projects - view projects",
    "",
    "SYNOPSIS",
    "    projects",
    "",
    "DESCRIPTION",
    "    Open GitHub profile in a new tab.",
    "",
    "SEE ALSO",
    "    about, contact",
    "",
  ],
  clear: [
    "",
    "NAME",
    "    clear - clear terminal screen",
    "",
    "SYNOPSIS",
    "    clear",
    "",
    "DESCRIPTION",
    "    Clear all terminal output. Also available via Ctrl+L.",
    "",
  ],
  whoami: [
    "",
    "NAME",
    "    whoami - display current user",
    "",
    "SYNOPSIS",
    "    whoami",
    "",
    "DESCRIPTION",
    "    Print the current username.",
    "",
  ],
  date: [
    "",
    "NAME",
    "    date - display current date and time",
    "",
    "SYNOPSIS",
    "    date",
    "",
    "DESCRIPTION",
    "    Print the current date and time.",
    "",
  ],
  echo: [
    "",
    "NAME",
    "    echo - display text",
    "",
    "SYNOPSIS",
    "    echo [text...]",
    "",
    "DESCRIPTION",
    "    Print the given text to the terminal.",
    "",
    "EXAMPLES",
    "    echo hello world",
    "",
  ],
  help: [
    "",
    "NAME",
    "    help - display command summary",
    "",
    "SYNOPSIS",
    "    help",
    "",
    "DESCRIPTION",
    "    Display a quick reference of available commands.",
    "    For detailed documentation, use 'man <command>'.",
    "",
    "SEE ALSO",
    "    man",
    "",
  ],
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
  { type: "output", content: "" },
]

export function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>(initialHistory)
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [gameState, setGameState] = useState<GameState>({ active: false, type: null })
  const mountTime = useRef(Date.now())

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
    const games = ["number", "wordle", "trivia", "blackjack", "rps", "tron"]
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

    return fs
  })

  // Force update for React reactivity on deep VFS changes
  const [, forceUpdate] = useState(0)

  // Load from localStorage on mount (Client-side only)
  useEffect(() => {
    const savedFS = localStorage.getItem("vfs-state")
    if (savedFS) {
      vfs.fromJSON(savedFS)
      forceUpdate(n => n + 1)
    }
  }, [vfs])

  // Persistence helper
  const saveFileSystem = () => {
    localStorage.setItem("vfs-state", vfs.toJSON())
  }

  // Sync currentDirectory string for display
  const [currentDirectory, setCurrentDirectory] = useState("~")

  // Update display path whenever vfs changes
  useEffect(() => {
    let path = vfs.getPwd()
    if (path.startsWith("/home/zachary")) {
      path = "~" + path.slice("/home/zachary".length)
    }
    setCurrentDirectory(path)
  }, [history, vfs])

  const [currentTheme, setCurrentTheme] = useState<ThemeName>("lumon")
  const [currentFont, setCurrentFont] = useState<FontName>("jetbrains")
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

  const handleCommandPalette = () => setShowPalette(prev => !prev)

  const handlePaletteExecute = (command: string) => {
    const parts = command.split(' && ')
    for (const part of parts) {
      handleCommand(part.trim())
    }
  }

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

  // Register handleCommand for executeCommand (called every render; ref assignment is cheap)
  useEffect(() => {
    terminalCtx.registerCommandHandler(handleCommand)
  })

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
      const data = gameState.data as { word: string }
      return `The word was: ${data.word.toUpperCase()}`
    }

    const normalizedGuess = guess.toLowerCase().trim()
    if (normalizedGuess.length !== 5 || !/^[a-z]+$/.test(normalizedGuess)) {
      return "Enter a 5-letter word."
    }

    const data = gameState.data as { word: string; attempts: number; maxAttempts: number; guesses: string[] }
    const word = data.word
    const attempts = data.attempts + 1
    const guesses = [...data.guesses]

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
        "",
      ]
    }

    if (attempts >= data.maxAttempts) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `Game over. The word was: ${word.toUpperCase()}`,
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

  const commands: Record<string, (args: string[]) => (string | { text: string; href: string })[] | (string | TerminalLine)[] | string | { text: string; href: string } | TerminalLine[] | null> = {
    help: () => {
      return [
        "",
        "COMMANDS",
        "",
        "  man <cmd>      Full documentation for any command",
        "",
        "  Navigation     ls, cd, pwd, cat, view",
        "  Collections    search, genre, format, type",
        "  Files          mkdir, touch, rm",
        "  Games          game <type>, suggest",
        "  Blog           notes",
        "  Style          theme, font, sound, neofetch",
        "  Info           about, contact, projects, whoami, date",
        "  Other          clear, echo, exit",
        "",
      ]
    },
    man: (args) => {
      const cmd = args[0]?.toLowerCase()

      if (!cmd) {
        const available = Object.keys(manPages).sort()
        return [
          "",
          "Available manual pages:",
          "",
          "  " + available.join(", "),
          "",
          "Usage: man <command>",
          "",
        ]
      }

      if (manPages[cmd]) {
        return manPages[cmd]
      }

      return `No manual entry for ${cmd}`
    },
    ls: (args) => {
      const path = args[0]
      const result = vfs.ls(path)

      if (result.length === 0) return ""

      // Check if in collection directory - show detailed info
      const pwd = vfs.getPwd()

      if (!path && pwd === '/home/zachary/books') {
        const lines: (string | TerminalLine)[] = [""]
        result.forEach(filename => {
          const node = vfs.resolve(filename)
          if (node && node.type === 'file' && node.content) {
            const c = node.content as { title?: string; author?: string }
            lines.push({ type: 'success', content: c.title || filename })
            if (c.author) lines.push({ type: 'output', content: '    by ' + c.author })
          } else {
            lines.push(filename)
          }
        })
        lines.push("")
        return lines
      }

      if (!path && pwd === '/home/zachary/vinyl') {
        const lines: (string | TerminalLine)[] = [""]
        result.forEach(filename => {
          const node = vfs.resolve(filename)
          if (node && node.type === 'file' && node.content) {
            const c = node.content as { title?: string; artist?: string }
            lines.push({ type: 'success', content: c.title || filename })
            if (c.artist) lines.push({ type: 'output', content: '    by ' + c.artist })
          } else {
            lines.push(filename)
          }
        })
        lines.push("")
        return lines
      }

      if (!path && pwd === '/home/zachary/hardware') {
        const lines: (string | TerminalLine)[] = [""]
        result.forEach(filename => {
          const node = vfs.resolve(filename)
          if (node && node.type === 'file' && node.content) {
            const c = node.content as { name?: string; type?: string; status?: string }
            lines.push({ type: 'success', content: c.name || filename })
            if (c.type) lines.push({ type: 'output', content: '    ' + c.type + (c.status ? ' • ' + c.status : '') })
          } else {
            lines.push(filename)
          }
        })
        lines.push("")
        return lines
      }

      if (!path && pwd === '/home/zachary/notes') {
        const lines: (string | TerminalLine)[] = [""]
        result.forEach(filename => {
          const node = vfs.resolve(filename)
          if (node && node.type === 'file' && node.content) {
            const c = node.content as { title?: string; date?: string; author?: string }
            lines.push({ type: 'success', content: c.title || filename })
            if (c.date) lines.push({ type: 'output', content: '    ' + c.date + (c.author ? ' by ' + c.author : '') })
          } else {
            lines.push(filename)
          }
        })
        lines.push("")
        return lines
      }

      return ["", ...result, ""]
    },
    cd: (args) => {
      const path = args[0] || "~"
      const err = vfs.cd(path)
      if (err) return err

      // Update state string
      let newPath = vfs.getPwd()
      if (newPath.startsWith("/home/zachary")) {
        newPath = "~" + newPath.slice("/home/zachary".length)
      }
      setCurrentDirectory(newPath)
      return ""
    },
    pwd: () => vfs.getPwd(),
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
    sound: (args) => {
      const sub = args[0]?.toLowerCase()
      if (sub === 'on') {
        if (!soundState.enabled) soundState.toggle()
        return 'Sound effects enabled'
      }
      if (sub === 'off') {
        if (soundState.enabled) soundState.toggle()
        return 'Sound effects disabled'
      }
      return `Sound effects: ${soundState.enabled ? 'on' : 'off'}`
    },
    view: (args) => {
      const path = args[0]
      if (!path) return "Usage: view <file>"

      const node = vfs.resolve(path)
      if (!node) return `view: ${path}: No such file`
      if (node.type !== "file") return `view: ${path}: Is a directory`

      const pwd = vfs.getPwd()

      // Determine type based on parent directory
      if (pwd.includes("/books")) {
        const book = node.content as { title: string; author: string; genre: string; format: string; pages?: number; cover?: string }
        const lines: TerminalLine[] = [{ type: "output", content: "" }]
        if (book.cover) {
          lines.push({ type: "image", content: book.title, src: book.cover })
        }
        lines.push({ type: "output", content: `  Title:   ${book.title}` })
        lines.push({ type: "output", content: `  Author:  ${book.author}` })
        lines.push({ type: "output", content: `  Genre:   ${book.genre}` })
        lines.push({ type: "output", content: `  Format:  ${book.format}` })
        if (book.pages) lines.push({ type: "output", content: `  Pages:   ${book.pages}` })
        lines.push({ type: "output", content: "" })
        return lines
      }

      if (pwd.includes("/vinyl")) {
        const record = node.content as { title: string; artist: string; genre: string; format: string; label: string; cover?: string }
        const lines: TerminalLine[] = [{ type: "output", content: "" }]
        if (record.cover) {
          lines.push({ type: "image", content: record.title, src: record.cover })
        }
        lines.push({ type: "output", content: `  Title:   ${record.title}` })
        lines.push({ type: "output", content: `  Artist:  ${record.artist}` })
        lines.push({ type: "output", content: `  Genre:   ${record.genre}` })
        lines.push({ type: "output", content: `  Format:  ${record.format}` })
        lines.push({ type: "output", content: `  Label:   ${record.label}` })
        lines.push({ type: "output", content: "" })
        return lines
      }

      if (pwd.includes("/hardware")) {
        const device = node.content as { name: string; type: string; status: string; processor: string; memory: string; storage: string; graphics?: string; operating_system?: string }
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

      if (pwd.includes("/notes")) {
        const note = node.content as { title: string; date: string; author: string; content: string[] }
        return [
          "",
          "=".repeat(60),
          note.title,
          "=".repeat(60),
          `Date: ${note.date} | Author: ${note.author}`,
          "",
          ...note.content,
          "",
          "=".repeat(60),
          "",
        ]
      }

      if (typeof node.content === "string") return node.content
      return JSON.stringify(node.content, null, 2)
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
          return `  ${String(idx).padStart(3, " ")}  ${r.title} - ${r.artist}`
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
          return `  ${String(idx).padStart(3, " ")}  ${b.title} - ${b.author}`
        })
        return ["", `${results.length} results`, "", ...list, ""]
      }

      if (currentDirectory === "~/notes") {
        const results = notesData.filter(
          (n) => n.title.toLowerCase().includes(term) || n.content.join(" ").toLowerCase().includes(term),
        )
        if (results.length === 0) return `No results for "${term}"`
        const list = results.map((n) => {
          const idx = notesData.indexOf(n) + 1
          return `  ${String(idx).padStart(3, " ")}  ${n.title} (${n.date})`
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
          return `  ${String(idx).padStart(3, " ")}  ${r.title} - ${r.artist}`
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
          return `  ${String(idx).padStart(3, " ")}  ${b.title} - ${b.author}`
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
          return `  ${String(idx).padStart(3, " ")}  ${r.title} - ${r.artist}`
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
          return `  ${String(idx).padStart(3, " ")}  ${b.title} - ${b.author}`
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
      setHistory(initialHistory)
      return null
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
          "  game tron        Light Cycle Arcade Game",
          "  game pacman      Classic Maze Chase",
          "  game basketball  Arcade Hoops",
          "",
        ]
      }

      if (gameType === "number") return startNumberGame()
      if (gameType === "wordle") return startWordleGame()
      if (gameType === "trivia") return startTriviaGame()
      if (gameType === "blackjack") return startBlackjackGame()
      if (gameType === "rps") return startRPSGame()
      if (gameType === "tron") {
        setGameState({ active: true, type: "tron" })
        return [] // No text output, UI takes over
      }
      if (gameType === "pacman") {
        setGameState({ active: true, type: "pacman" })
        return [] // No text output, UI takes over
      }
      if (gameType === "basketball") {
        setGameState({ active: true, type: "basketball" })
        return [] // No text output, UI takes over
      }

      return `Unknown game: ${gameType}`
    },
    mkdir: (args) => {
      const path = args[0]
      if (!path) return "Usage: mkdir <directory>"
      const err = vfs.mkdir(path)
      if (err) return err
      saveFileSystem()
      return ""
    },
    touch: (args) => {
      const path = args[0]
      if (!path) return "Usage: touch <filename>"
      const err = vfs.touch(path)
      if (err) return err
      saveFileSystem()
      return ""
    },
    rm: (args) => {
      const path = args[0]
      if (!path) return "Usage: rm <path>"
      const err = vfs.rm(path)
      if (err) return err
      saveFileSystem()
      return ""
    },
    neofetch: () => {
      const uptimeMs = Date.now() - mountTime.current
      const uptimeMin = Math.floor(uptimeMs / 60000)
      const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
      const uptime = uptimeMin > 0 ? `${uptimeMin}m ${uptimeSec}s` : `${uptimeSec}s`

      const art = [
        '  ┌──────────┐',
        '  │  ██████  │',
        '  │  █    █  │',
        '  │  █    █  │',
        '  │  ██████  │',
        '  │  ██  ██  │',
        '  │          │',
        '  └──────────┘',
      ]
      const info = [
        '   zachary@home',
        '   ──────────────',
        `   OS: CYBER_PORTFOLIO v1.0`,
        `   Shell: zach-sh`,
        `   Theme: ${themes[currentTheme].name}`,
        `   Font: ${fonts[currentFont].name}`,
        `   Collections: ${booksData.length} books, ${vinylData.length} vinyl, ${hardwareData.length} hardware`,
        `   Games: ${GAME_NAMES.length} available`,
      ]
      const lines = ['']
      for (let i = 0; i < Math.max(art.length, info.length); i++) {
        lines.push((art[i] || '                ') + (info[i] || ''))
      }
      lines.push(`                 Uptime: ${uptime}`)
      lines.push('')
      return lines
    },
    cat: (args) => {
      const path = args[0]
      if (!path) return "Usage: cat <file>"

      const node = vfs.resolve(path)
      if (!node) return `cat: ${path}: No such file or directory`
      if (node.type !== "file") return `cat: ${path}: Is a directory`

      if (typeof node.content === "string") return node.content
      return JSON.stringify(node.content, null, 2)
    },
    notes: (args) => {
      const noteNum = args[0]

      if (!noteNum) {
        // List all notes
        const lines: string[] = ["", "BLOG & UPDATES", ""]
        notesData.forEach((note, idx) => {
          lines.push(`  ${idx + 1}. ${note.title}`)
          lines.push(`     ${note.date} by ${note.author}`)
          lines.push("")
        })
        lines.push("Type 'notes <number>' to read a note")
        lines.push("")
        return lines
      }

      const index = parseInt(noteNum) - 1
      if (isNaN(index) || index < 0 || index >= notesData.length) {
        return `Invalid note number. Use 'notes' to see available notes.`
      }

      const note = notesData[index]
      return [
        "",
        "=".repeat(60),
        note.title,
        "=".repeat(60),
        `Date: ${note.date} | Author: ${note.author}`,
        "",
        ...note.content,
        "",
        "=".repeat(60),
        "",
      ]
    },
    sudo: () => "Permission denied",
    exit: () => "Use Cmd+W or Ctrl+W to close",
    suggest: () => startSuggestCommand(),
  }

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    setHistory((prev) => [...prev, { type: "input", content: `${currentDirectory} $ ${trimmedCmd}` }])

    if (gameState.active) {
      // Handle async suggest command separately
      if (gameState.type === "suggest") {
        handleSuggestCommand(trimmedCmd).then(result => {
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
      if (result === null || result === undefined) {
        // Command handled its own output (e.g., clear)
      } else if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'type' in result[0]) {
        // TerminalLine[] — append directly, spreading to preserve all properties (src, centered, href)
        setHistory(prev => [...prev, ...(result as TerminalLine[]).map(item => ({ ...item }))])
      } else {
        const items = Array.isArray(result) ? result : [result]
        items.forEach((item) => {
          if (typeof item === "object" && "href" in item) {
            setHistory((prev) => [
              ...prev,
              { type: "link", content: (item as { text: string; href: string }).text, href: (item as { text: string; href: string }).href },
            ])
          } else if (typeof item === "object" && "type" in item && "content" in item) {
            // Single TerminalLine object — spread to preserve all properties
            setHistory((prev) => [...prev, { ...(item as TerminalLine) }])
          } else {
            const line = typeof item === "string" ? item : String(item)
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

  const prompt = gameState.active ? `[${gameState.type}]` : `${currentDirectory} $`

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
      ) : (
        <>
          <HistoryDisplay history={history} />
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
