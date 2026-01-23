# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Status:** No testing framework configured

This is a **zero-test codebase**. No Jest, Vitest, or other test runners are present in the project.

**Runtime:**
- Node.js / Next.js 15 (development and production)

**Build Tools:**
- Next.js 15 with TypeScript 5
- ESLint for code quality (linting only)
- No test runners or assertion libraries in `package.json`

## Why No Tests

The codebase is primarily a **single-page terminal UI application** with:
1. Deterministic UI state management (all state in React components)
2. Self-contained game logic (mini-games built into terminal component)
3. Virtual file system entirely in-memory (no external dependencies)
4. Interactive nature makes manual testing more practical than automated testing

## Code Quality Approach

**Linting:**
```bash
npm run lint           # Run ESLint
```

**TypeScript:**
```bash
npx tsc --noEmit      # Type checking (done during build)
```

**Build Verification:**
```bash
npm run build          # Verifies compilation errors
```

## Testing Patterns (If Tests Were Added)

### Current State Management Pattern

**Location:** `components/terminal.tsx` (main state management)

State is managed with React hooks:
```typescript
const [history, setHistory] = useState<TerminalLine[]>([...])
const [input, setInput] = useState("")
const [commandHistory, setCommandHistory] = useState<string[]>([])
const [gameState, setGameState] = useState<GameState>({ active: false, type: null })

// Refs for mutable state
const playerPos = useRef<Point>({ x: 10, y: 30 })
const playerDir = useRef<Direction>("RIGHT")
const gameLoopRef = useRef<number>()
```

If tests were added, this pattern would be testable via:
- Component rendering with React Testing Library
- State initialization and updates
- Event handler behavior (KeyboardEvent handling)

### Virtual File System (Testable)

**Location:** `lib/vfs.ts`

The VirtualFileSystem class is already well-suited for unit testing:

```typescript
export class VirtualFileSystem {
    // All methods have clear input/output contracts

    cd(path: string): string | null { ... }
    ls(path?: string): string[] { ... }
    mkdir(path: string): string | null { ... }
    touch(path: string): string | null { ... }
    rm(path: string): string | null { ... }
    resolve(path: string): FileSystemNode | null { ... }
    getPwd(): string { ... }
}
```

**Ideal Test Structure:**
```typescript
describe('VirtualFileSystem', () => {
    let vfs: VirtualFileSystem

    beforeEach(() => {
        vfs = new VirtualFileSystem()
    })

    describe('cd()', () => {
        it('should navigate to existing directory', () => {
            vfs.mkdir('books')
            expect(vfs.cd('books')).toBeNull()
            expect(vfs.getPwd()).toBe('/home/zachary/books')
        })

        it('should return error for non-existent path', () => {
            const result = vfs.cd('nonexistent')
            expect(result).toBe('cd: nonexistent: No such file or directory')
        })
    })

    describe('mkdir()', () => {
        it('should create directory in current path', () => {
            expect(vfs.mkdir('newdir')).toBeNull()
            expect(vfs.ls()).toContain('newdir')
        })

        it('should create nested directories', () => {
            expect(vfs.mkdir('a/b/c')).toBeNull()
            expect(vfs.cd('a/b/c')).toBeNull()
        })
    })
})
```

### Game Logic Patterns

**Tron Game Logic** (`components/games/tron-game.tsx`):

Game state could be extracted and tested:
```typescript
// AI Logic - Flood Fill Heuristic
const countReachable = (startPos: Point, trails: Set<string>, w: number, h: number, maxDepth: number = 50): number => {
    // BFS algorithm - deterministic, testable
    const queue: Point[] = [startPos]
    const visited = new Set<string>()
    // ...
    return count
}
```

**Testable behaviors:**
- AI movement direction selection based on reachable spaces
- Collision detection (player/CPU trails, walls)
- Game win/loss conditions
- Score tracking and level progression

### Command Execution Pattern

**Terminal Commands** (`components/terminal.tsx`):

Commands are defined in an object pattern suitable for testing:
```typescript
const commands: Record<string, (...args: any[]) => string | string[] | ReactNode | null> = {
    help: () => [...],
    ls: (path?: string) => [...],
    cd: (path: string) => [...],
    pwd: () => [...],
    // etc.
}
```

**Test Pattern Would Be:**
```typescript
describe('Terminal Commands', () => {
    describe('ls command', () => {
        it('should list files in current directory', () => {
            const result = commands.ls()
            expect(result).toBeInstanceOf(Array)
        })
    })
})
```

## Current Testing Approach

**Manual Testing:**
- Browser-based testing of terminal commands
- Game play-testing for Tron game AI behavior
- UI responsiveness testing
- Cross-browser compatibility testing

**Type Safety (Instead of Runtime Tests):**
- TypeScript strict mode catches type errors at compile time
- Union types enforce proper state handling
- Interface definitions provide contracts

## Data Structures for Testing (If Implemented)

**Test Fixtures Location:** `tests/fixtures/` (recommended but not created)

**Example VFS Fixtures:**
```typescript
// tests/fixtures/vfs.ts
export const createTestVFS = (): VirtualFileSystem => {
    const vfs = new VirtualFileSystem()

    // Pre-populate with test data
    vfs.mkdir('books')
    vfs.mkdir('vinyl')
    vfs.mkdir('hardware')

    return vfs
}

export const testBooks = [
    { title: "Dune", author: "Frank Herbert" },
    { title: "1984", author: "George Orwell" }
]
```

## Testing Recommendations (If Adopted)

**Framework Choice:** Vitest
- Zero-config with TypeScript
- Fast feedback loop
- Compatible with Next.js
- ESM-native (aligns with modern JavaScript)

**Coverage Targets:**
- VirtualFileSystem: 100% (pure logic, critical path)
- Command handlers: 80%+ (state-heavy, harder to test)
- Game AI logic: 70%+ (complex but important for UX)
- UI components: Integration tests only (use React Testing Library)

**Configuration (If Added):**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
```

**Installation Command:**
```bash
npm install -D vitest @vitest/ui jsdom @react-testing-library/react @react-testing-library/jest-dom
```

## Code Organization for Testing

**Current Structure:**
```
woot/
├── components/
│   ├── terminal.tsx         # Main component (hard to test, monolithic)
│   ├── games/
│   │   └── tron-game.tsx    # Game logic (testable if extracted)
│   └── ui/                  # shadcn/ui components (not custom)
├── lib/
│   ├── vfs.ts              # TESTABLE: Pure class, no side effects
│   └── utils.ts            # (if created, utilities would go here)
├── data/
│   ├── books.json          # Test data source
│   ├── vinyl.json
│   └── hardware.json
└── app/
    ├── layout.tsx
    └── page.tsx
```

**Recommended Test Structure (If Implemented):**
```
woot/
└── tests/
    ├── unit/
    │   ├── lib/
    │   │   └── vfs.test.ts           # VFS unit tests
    │   ├── games/
    │   │   └── tron-ai.test.ts       # Extracted AI logic
    │   └── commands.test.ts          # Command handler logic
    ├── integration/
    │   ├── terminal.test.tsx         # Terminal component integration
    │   └── game-flow.test.tsx        # Game state transitions
    ├── fixtures/
    │   └── vfs.ts                    # Test data helpers
    └── setup.ts                      # Test configuration
```

## Mocking Strategy (If Tests Were Added)

**What to Mock:**
- `localStorage` (theme/font preferences)
- `window.addEventListener` (keyboard input)
- `requestAnimationFrame` (game loop timing)
- `dynamic()` imports (Tron game loading)

**What NOT to Mock:**
- VirtualFileSystem (pure class, should be real)
- Game state objects (simple data structures)
- Command definitions (should be real)
- React hooks (test through component behavior)

**Example Mock Pattern:**
```typescript
// Mock localStorage for theme tests
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
global.localStorage = mockLocalStorage as any

// Mock requestAnimationFrame for game loop
global.requestAnimationFrame = vi.fn((cb) => {
    cb(0)
    return 1
})
```

## Integration Test Patterns

**Terminal State Flow:**
```typescript
describe('Terminal Command Flow', () => {
    it('should handle cd, ls, pwd sequence', async () => {
        const { getByRole } = render(<Terminal />)
        const input = getByRole('textbox')

        // Type command
        await userEvent.type(input, 'mkdir books')
        await userEvent.keyboard('{Enter}')

        // Verify state changed
        await userEvent.type(input, 'cd books')
        await userEvent.keyboard('{Enter}')

        // Check pwd output
        await userEvent.type(input, 'pwd')
        await userEvent.keyboard('{Enter}')

        expect(screen.getByText(/\/home\/zachary\/books/)).toBeInTheDocument()
    })
})
```

---

*Testing analysis: 2026-01-22*
