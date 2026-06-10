# Terminal Depth (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Repo note:** subagents cannot run commands in this repo (permission denials) — use inline execution (superpowers:executing-plans).

**Goal:** Pipes with filter commands, `history` + `!!`/`!n` expansion, ghost autosuggestions, and easter eggs (`rm -rf /` meltdown, `vim` trap, `sl`, `cowsay`, Konami-unlocked `phosphor` theme).

**Architecture:** Filters are pure registry commands marked `filter: true` that read `context.stdin`; the executor splits on `|`, flattens rich output to strings between stages. History expansion, the vim trap, Konami, and timed "scripts" (meltdown/sl) are terminal-host concerns in `components/terminal.tsx`. Spec: `docs/superpowers/specs/2026-06-09-terminal-enhancements-design.md`.

**Tech Stack:** Existing registry (`lib/commands/`), Vitest + RTL (happy-dom), no new dependencies.

**Conventions for every task:** run tests with `npx vitest run <file>`; the final task runs the full gate (`npm run lint && npm run typecheck && npx vitest run && npm run build`). Test mocks for `ExecuteContext` follow the pattern in `lib/commands/__tests__/executor.test.ts`.

---

### Task 1: Filter commands (`grep`, `head`, `tail`, `wc`, `sort`)

**Files:**
- Modify: `lib/commands/types.ts` (add `stdin`, `filter`, `history.commands`)
- Create: `lib/commands/commands/filters.ts`
- Create: `lib/commands/__tests__/filters.test.ts`
- Modify: `lib/commands/commands/index.ts`, `lib/commands/index.ts` (register)

- [ ] **Step 1: Extend ExecuteContext and CommandDefinition in `lib/commands/types.ts`**

In the `ExecuteContext` interface, change the `history` block and add `stdin`:

```ts
  history: {
    add: (line: TerminalLine) => void
    clear: () => void
    /** Submitted command strings, oldest first (for `history` and `!!`). */
    commands: () => string[]
  }
  /** Lines piped from the previous pipeline stage (filter commands only). */
  stdin?: string[]
```

In `CommandDefinition` add:

```ts
  /** Filter commands consume context.stdin and may appear after a `|`. */
  filter?: boolean
```

- [ ] **Step 2: Update every test mock context to include `history.commands`**

Run this script (it appends `commands: () => [],` to each mock's history object):

```bash
python3 - << 'EOF'
import glob, re
for path in glob.glob('lib/commands/__tests__/*.test.ts'):
    src = open(path).read()
    new = re.sub(r"(history: \{\n(?:.*\n)*?      clear: (?:vi\.fn\(\)|\(\) => \{\})),\n",
                 r"\1,\n      commands: () => [],\n", src)
    if new != src:
        open(path, 'w').write(new); print('updated', path)
EOF
npm run typecheck
```

Expected: typecheck clean (the script must update all 10 files; if any mock uses a different shape, add `commands: () => [],` to its `history` object by hand).

- [ ] **Step 3: Write failing tests** — `lib/commands/__tests__/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { grepCommand, headCommand, tailCommand, wcCommand, sortCommand } from '../commands/filters'
import type { ExecuteContext, ThemeName, FontName } from '../types'

function ctx(stdin?: string[]): ExecuteContext {
  return {
    vfs: { pwd: () => '/', cd: () => null, ls: () => [], resolve: () => null, mkdir: () => null, touch: () => null, rm: () => null },
    history: { add: () => {}, clear: () => {}, commands: () => [] },
    game: { start: () => '', end: () => {}, isActive: () => false },
    theme: { current: 'midnight' as ThemeName, set: () => {}, list: () => [], config: () => ({ name: 'Midnight' }) },
    font: { current: 'jetbrains' as FontName, set: () => {}, list: () => [], config: () => ({ name: 'JetBrains Mono' }) },
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    currentDirectory: '~',
    setCurrentDirectory: () => {},
    openUrl: () => {},
    collections: { books: [], vinyl: [], hardware: [], notes: [] },
    stdin,
  }
}

const LINES = ['alpha', 'Bravo', 'charlie', '', 'bravo two']

describe('grep', () => {
  it('errors without stdin', () => {
    expect(grepCommand.execute(['x'], ctx())).toEqual({ success: false, error: 'grep: missing input — use in a pipeline (e.g. ls | grep books)' })
  })
  it('errors without a pattern', () => {
    expect(grepCommand.execute([], ctx(LINES))).toEqual({ success: false, error: 'Usage: grep <pattern>' })
  })
  it('matches case-insensitively', () => {
    expect(grepCommand.execute(['bravo'], ctx(LINES))).toEqual({ success: true, output: ['Bravo', 'bravo two'] })
  })
  it('-v inverts the match', () => {
    expect(grepCommand.execute(['-v', 'bravo'], ctx(LINES))).toEqual({ success: true, output: ['alpha', 'charlie', ''] })
  })
  it('returns empty output on no matches (pipeline-safe, like real grep)', () => {
    expect(grepCommand.execute(['zz'], ctx(LINES))).toEqual({ success: true, output: [] })
  })
  it('is marked as a filter', () => {
    expect(grepCommand.filter).toBe(true)
  })
})

describe('head/tail', () => {
  it('head defaults to 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => `l${i}`)
    expect(headCommand.execute([], ctx(many))).toEqual({ success: true, output: many.slice(0, 10) })
  })
  it('head takes a count', () => {
    expect(headCommand.execute(['2'], ctx(LINES))).toEqual({ success: true, output: ['alpha', 'Bravo'] })
  })
  it('tail takes a count from the end', () => {
    expect(tailCommand.execute(['2'], ctx(LINES))).toEqual({ success: true, output: ['', 'bravo two'] })
  })
  it('head rejects a non-numeric count', () => {
    expect(headCommand.execute(['x'], ctx(LINES))).toEqual({ success: false, error: 'head: invalid count: x' })
  })
})

describe('wc', () => {
  it('counts non-empty lines', () => {
    expect(wcCommand.execute([], ctx(LINES))).toEqual({ success: true, output: '4' })
  })
})

describe('sort', () => {
  it('sorts lexicographically, case-insensitive', () => {
    expect(sortCommand.execute([], ctx(['b', 'A', 'c']))).toEqual({ success: true, output: ['A', 'b', 'c'] })
  })
  it('-r reverses', () => {
    expect(sortCommand.execute(['-r'], ctx(['b', 'A', 'c']))).toEqual({ success: true, output: ['c', 'b', 'A'] })
  })
})
```

- [ ] **Step 4: Run to verify failure** — `npx vitest run lib/commands/__tests__/filters.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 5: Implement** — `lib/commands/commands/filters.ts`:

```ts
import type { CommandDefinition } from '../types'
import { success, error } from '../types'

function requireStdin(name: string, stdin: string[] | undefined, example: string) {
  if (!stdin) return error(`${name}: missing input — use in a pipeline (e.g. ${example})`)
  return null
}

export const grepCommand: CommandDefinition = {
  name: 'grep',
  description: 'Filter piped lines by substring',
  usage: 'grep <pattern> [-v]',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('grep', context.stdin, 'ls | grep books')
    if (missing) return missing
    const invert = args.includes('-v')
    const pattern = args.filter((a) => a !== '-v').join(' ').toLowerCase()
    if (!pattern) return error('Usage: grep <pattern>')
    // Empty output on no matches (like real grep) so pipelines stay correct:
    // `ls | grep zzz | wc` must report 0, not count an error message.
    return success(context.stdin!.filter((l) => l.toLowerCase().includes(pattern) !== invert))
  },
}

function sliceCommand(name: 'head' | 'tail'): CommandDefinition {
  return {
    name,
    description: `Show the ${name === 'head' ? 'first' : 'last'} n piped lines`,
    usage: `${name} [n]`,
    filter: true,
    execute: (args, context) => {
      const missing = requireStdin(name, context.stdin, `notes | ${name} 5`)
      if (missing) return missing
      const n = args[0] === undefined ? 10 : parseInt(args[0], 10)
      if (Number.isNaN(n) || n < 0) return error(`${name}: invalid count: ${args[0]}`)
      const lines = context.stdin!
      return success(name === 'head' ? lines.slice(0, n) : lines.slice(Math.max(0, lines.length - n)))
    },
  }
}

export const headCommand = sliceCommand('head')
export const tailCommand = sliceCommand('tail')

export const wcCommand: CommandDefinition = {
  name: 'wc',
  description: 'Count non-empty piped lines',
  usage: 'wc',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('wc', context.stdin, 'ls | wc')
    if (missing) return missing
    return success(String(context.stdin!.filter((l) => l.trim() !== '').length))
  },
}

export const sortCommand: CommandDefinition = {
  name: 'sort',
  description: 'Sort piped lines',
  usage: 'sort [-r]',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('sort', context.stdin, 'ls | sort')
    if (missing) return missing
    const sorted = [...context.stdin!].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    return success(args.includes('-r') ? sorted.reverse() : sorted)
  },
}
```

Register: in `lib/commands/commands/index.ts` add
`export { grepCommand, headCommand, tailCommand, wcCommand, sortCommand } from './filters'`;
in `lib/commands/index.ts` `createDefaultRegistry()` add five `registry.register(commands.grepCommand)`-style lines after the system block.

- [ ] **Step 6: Run to verify pass** — `npx vitest run lib/commands` — Expected: all pass.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(terminal): grep/head/tail/wc/sort filter commands"`

---

### Task 2: Pipeline execution in the executor

**Files:**
- Modify: `lib/commands/executor.ts`
- Test: `lib/commands/__tests__/executor.test.ts` (append describe block)

- [ ] **Step 1: Write failing tests** — append to `executor.test.ts` (use its existing `createMockContext`/`createMockRegistry`, registering real filters):

```ts
import { grepCommand, wcCommand } from '../commands/filters'
import { success as ok } from '../types'

describe('pipelines', () => {
  function pipeRegistry() {
    const registry = createRegistry()
    registry.register({ name: 'emit', description: '', usage: '', execute: () => ok(['one', 'two', 'three']) })
    registry.register({
      name: 'rich', description: '', usage: '',
      execute: () => ok([{ type: 'success', content: 'Dune' }, { type: 'output', content: '    by Frank Herbert' }]),
    })
    registry.register(grepCommand)
    registry.register(wcCommand)
    return registry
  }

  it('pipes output lines into a filter', () => {
    const result = executeCommand('emit | grep t', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: ['two', 'three'] })
  })

  it('chains multiple stages', () => {
    const result = executeCommand('emit | grep t | wc', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: '2' })
  })

  it('flattens TerminalLine output to content strings', () => {
    const result = executeCommand('rich | grep frank', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: ['    by Frank Herbert'] })
  })

  it('rejects non-filter commands after a pipe', () => {
    const result = executeCommand('emit | emit', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: false, error: 'emit: not a filter command' })
  })

  it('propagates a first-stage error without running filters', () => {
    const registry = pipeRegistry()
    registry.register({ name: 'boom', description: '', usage: '', execute: () => ({ success: false, error: 'boom failed' }) })
    expect(executeCommand('boom | wc', createMockContext(), registry)).toEqual({ success: false, error: 'boom failed' })
  })

  it('rejects empty pipe segments', () => {
    expect(executeCommand('emit | | wc', createMockContext(), pipeRegistry())).toEqual({ success: false, error: 'syntax error near unexpected token `|`' })
  })
})
```

(Adjust the `createRegistry` import to match the file's existing imports.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/commands/__tests__/executor.test.ts` — Expected: pipeline tests FAIL (whole string treated as one command).

- [ ] **Step 3: Implement** — replace the body of `executeCommand` in `lib/commands/executor.ts`:

```ts
import type { CommandOutput } from '@/lib/types/terminal'

/** Flatten any CommandOutput into plain text lines for piping. */
function flattenOutput(output: CommandOutput): string[] {
  if (typeof output === 'string') return [output]
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === 'string' ? item : item.content))
  }
  return [output.content]
}

export function executeCommand(
  input: string,
  context: ExecuteContext,
  registry: CommandRegistry
): CommandResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { success: true, output: '' }
  }

  const segments = trimmed.split('|').map((s) => s.trim())
  if (segments.some((s) => s === '')) {
    return error('syntax error near unexpected token `|`')
  }

  let result = executeSingle(segments[0], context, registry)

  for (const segment of segments.slice(1)) {
    if (!result.success) return result
    const [name, ...args] = segment.split(/\s+/)
    const command = registry.get(name)
    if (!command) return error(`command not found: ${name}`)
    if (!command.filter) return error(`${name}: not a filter command`)
    result = command.execute(args, { ...context, stdin: flattenOutput(result.output) })
  }

  return result
}

function executeSingle(segment: string, context: ExecuteContext, registry: CommandRegistry): CommandResult {
  const [commandName, ...args] = segment.split(/\s+/)
  const command = registry.get(commandName)
  if (!command) return error(`command not found: ${commandName}`)
  return command.execute(args, context)
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): pipeline execution (cmd | grep | wc)"`

---

### Task 3: `history` command

**Files:**
- Modify: `lib/commands/commands/system.ts` (add `historyCommand`)
- Modify: `lib/commands/commands/index.ts`, `lib/commands/index.ts` (register)
- Modify: `components/terminal.tsx` (`buildExecuteContext` history block)
- Test: `lib/commands/__tests__/system.test.ts` (append)

- [ ] **Step 1: Write failing tests** — append to `system.test.ts`:

```ts
import { historyCommand } from '../commands/system'

describe('historyCommand', () => {
  it('lists numbered commands oldest-first', () => {
    const context = createMockContext()
    context.history.commands = () => ['ls', 'cd books', 'view dune']
    expect(historyCommand.execute([], context)).toEqual({
      success: true,
      output: ['', '    1  ls', '    2  cd books', '    3  view dune', ''],
    })
  })
  it('reports empty history', () => {
    expect(historyCommand.execute([], createMockContext())).toEqual({ success: true, output: 'history: no commands yet' })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/commands/__tests__/system.test.ts` — Expected: FAIL (no export).

- [ ] **Step 3: Implement** — append to `system.ts`:

```ts
export const historyCommand: CommandDefinition = {
  name: 'history',
  description: 'Show command history',
  usage: 'history',
  execute: (args, context) => {
    const commands = context.history.commands()
    if (commands.length === 0) return success('history: no commands yet')
    return success(['', ...commands.map((c, i) => `${String(i + 1).padStart(5, ' ')}  ${c}`), ''])
  },
}
```

Register it (barrel + `createDefaultRegistry`). In `components/terminal.tsx` `buildExecuteContext`, the history block becomes:

```ts
    history: {
      add: (line) => setHistory((prev) => [...prev, line]),
      clear: () => setHistory(initialHistory),
      commands: () => commandHistory,
    },
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands && npm run typecheck` — Expected: pass/clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): history command"`

---

### Task 4: `!!` and `!n` expansion

**Files:**
- Modify: `components/terminal.tsx` (`handleCommand`, before the input echo)
- Test: Create `components/__tests__/terminal-history-expansion.test.tsx`

- [ ] **Step 1: Write failing tests** (harness copied from `terminal-deeplink.test.tsx` — same localStorage/matchMedia mocks and `WrappedTerminal`):

```tsx
// ...same imports/mocks/WrappedTerminal as terminal-deeplink.test.tsx...
import userEvent from '@testing-library/user-event'

describe('history expansion', () => {
  it('!! repeats the previous command and echoes the expansion', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'pwd{Enter}')
    await user.type(input, '!!{Enter}')
    await waitFor(() => {
      // pwd ran twice; the echoed input line shows the expanded command
      expect(screen.getAllByText('/home/zachary').length).toBe(2)
      expect(screen.getAllByText(/\$ pwd/).length).toBe(2)
    })
  })

  it('!n runs the nth command from history', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'whoami{Enter}')
    await user.type(input, 'pwd{Enter}')
    await user.type(input, '!1{Enter}')
    await waitFor(() => {
      expect(screen.getAllByText('zachary').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('reports unknown events', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, '!99{Enter}')
    await waitFor(() => {
      expect(screen.getByText('!99: event not found')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/__tests__/terminal-history-expansion.test.tsx` — Expected: FAIL (`command not found: !!`).

- [ ] **Step 3: Implement** — in `handleCommand`, right after `const trimmedCmd = cmd.trim()` / empty check and BEFORE the input echo line, insert:

```ts
    // bash-style history expansion: `!!` = previous command, `!n` = nth
    let expandedCmd = trimmedCmd
    const bang = trimmedCmd.match(/^!(!|\d+)$/)
    if (bang) {
      const target = bang[1] === '!' ? commandHistory[commandHistory.length - 1] : commandHistory[parseInt(bang[1], 10) - 1]
      if (!target) {
        setHistory((prev) => [
          ...prev,
          { type: 'input', content: `${currentDirectory} $ ${trimmedCmd}` },
          { type: 'error', content: `${trimmedCmd}: event not found` },
        ])
        setInput('')
        return
      }
      expandedCmd = target
    }
```

Then replace every later use of `trimmedCmd` in `handleCommand` (the input echo, game dispatch, commandHistory push, executor dispatch) with `expandedCmd`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: all pass (characterization included).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): !! and !n history expansion"`

---

### Task 5: Ghost autosuggestions

**Files:**
- Modify: `components/terminal/InputLine.tsx` (props `suggestion`, ArrowRight accept, dimmed render)
- Modify: `components/terminal.tsx` (compute suggestion, pass prop)
- Test: `components/terminal/__tests__/InputLine.test.tsx` (append)

- [ ] **Step 1: Write failing tests** — append to `InputLine.test.tsx` (reuse its existing default-props helper, adding the new props):

```tsx
describe('ghost suggestion', () => {
  it('renders the remainder of the suggestion dimmed', () => {
    render(<InputLine {...defaultProps} value="cd b" suggestion="cd books" />)
    expect(screen.getByText('ooks')).toBeInTheDocument()
  })

  it('ArrowRight at end of input accepts the suggestion', () => {
    const onChange = vi.fn()
    render(<InputLine {...defaultProps} value="cd b" suggestion="cd books" onChange={onChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    input.setSelectionRange(4, 4)
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('cd books')
  })

  it('renders nothing extra without a suggestion', () => {
    render(<InputLine {...defaultProps} value="cd b" />)
    expect(screen.queryByText('ooks')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/terminal/__tests__/InputLine.test.tsx` — Expected: FAIL (unknown prop ignored, no dimmed text).

- [ ] **Step 3: Implement** — in `InputLine.tsx`:

Add to `InputLineProps`: `suggestion?: string`. Destructure it. In `handleKeyDown`, before the existing branches:

```ts
      if (
        e.key === 'ArrowRight' &&
        suggestion &&
        suggestion.startsWith(value) &&
        suggestion !== value &&
        inputRef.current?.selectionStart === value.length
      ) {
        e.preventDefault()
        onChange(suggestion)
        return
      }
```

In the highlight overlay, after `{renderTokens(tokens)}` and BEFORE the cursor span:

(no change — keep cursor position) — instead, AFTER the cursor span add:

```tsx
            {suggestion && suggestion.startsWith(value) && suggestion !== value && (
              <span className="text-muted-foreground opacity-50">{suggestion.slice(value.length)}</span>
            )}
```

In `components/terminal.tsx`, compute above the JSX return:

```ts
  const ghostSuggestion =
    input.length > 0
      ? [...commandHistory].reverse().find((c) => c.startsWith(input) && c !== input)
      : undefined
```

and pass `suggestion={ghostSuggestion}` to `<InputLine …>`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): fish-style ghost autosuggestions"`

---

### Task 6: `cowsay`

**Files:**
- Create: `lib/commands/commands/fun.ts`
- Test: Create `lib/commands/__tests__/fun.test.ts`
- Modify: barrel + `createDefaultRegistry`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect } from 'vitest'
import { cowsayCommand } from '../commands/fun'
// reuse the ctx() helper shape from filters.test.ts (copy it; no stdin needed)

describe('cowsay', () => {
  it('errors without text', () => {
    expect(cowsayCommand.execute([], ctx())).toEqual({ success: false, error: 'Usage: cowsay <text>' })
  })
  it('wraps text in a bubble with the cow', () => {
    const result = cowsayCommand.execute(['moo'], ctx())
    expect(result.success).toBe(true)
    const out = (result as { output: string[] }).output
    expect(out).toContain(' < moo >')
    expect(out.join('\n')).toContain('(oo)')
  })
  it('wraps long text at 40 columns into multiple bubble lines', () => {
    const text = 'a'.repeat(50) + ' ' + 'b'.repeat(20)
    const result = cowsayCommand.execute(text.split(' '), ctx())
    const out = (result as { output: string[] }).output
    expect(out.filter((l: string) => l.startsWith(' | ') || l.startsWith(' < ')).length).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/commands/commands/fun.ts`:

```ts
import type { CommandDefinition } from '../types'
import { success, error } from '../types'

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? line + ' ' + word : word
    }
    while (line.length > width) {
      lines.push(line.slice(0, width))
      line = line.slice(width)
    }
  }
  if (line) lines.push(line)
  return lines
}

export const cowsayCommand: CommandDefinition = {
  name: 'cowsay',
  description: 'A cow says things',
  usage: 'cowsay <text>',
  execute: (args) => {
    const text = args.join(' ').trim()
    if (!text) return error('Usage: cowsay <text>')
    const lines = wrap(text, 40)
    const width = Math.max(...lines.map((l) => l.length))
    const bubble =
      lines.length === 1
        ? [` < ${lines[0]} >`]
        : lines.map((l, i) => {
            const pad = l.padEnd(width)
            if (i === 0) return ` / ${pad} \\`
            if (i === lines.length - 1) return ` \\ ${pad} /`
            return ` | ${pad} |`
          })
    return success([
      '',
      ` ${'_'.repeat(width + 2)}`,
      ...bubble,
      ` ${'-'.repeat(width + 2)}`,
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
      '',
    ])
  },
}
```

Register in barrel + `createDefaultRegistry`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands` — Expected: pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): cowsay"`

---

### Task 7: Script player + `sl` + `rm -rf /` meltdown

**Files:**
- Modify: `components/terminal.tsx`
- Test: Create `components/__tests__/terminal-easter-eggs.test.tsx`

- [ ] **Step 1: Write failing tests** (same harness as Task 4; mock `matchMedia` so reduced-motion is TRUE → scripts render instantly, no fake timers needed):

```tsx
// mockMatchMedia returns matches:true for prefers-reduced-motion (copy the
// mockReducedMotion helper from components/__tests__/boot-sequence.test.tsx
// and apply it in beforeEach)

describe('easter eggs', () => {
  it('sl drives a train through the terminal', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'sl{Enter}')
    await waitFor(() => {
      expect(screen.getByText(/====        ________/)).toBeInTheDocument()
    })
  })

  it('rm -rf / melts down and reboots to the banner', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'pwd{Enter}')
    await user.type(screen.getByRole('textbox'), 'rm -rf /{Enter}')
    await waitFor(() => {
      expect(screen.getByText(/KERNEL PANIC/)).toBeInTheDocument()
    })
    // reboot resets history: pwd output is gone, banner is back
    await waitFor(() => {
      expect(screen.queryByText('/home/zachary')).not.toBeInTheDocument()
      expect(screen.getByText(/developer.*collector.*gamer/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('plain rm still works on files', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'touch zz-test{Enter}')
    await user.type(screen.getByRole('textbox'), 'rm zz-test{Enter}')
    await user.type(screen.getByRole('textbox'), 'ls{Enter}')
    await waitFor(() => {
      expect(screen.queryByText('zz-test')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (`command not found: sl`; `rm: missing operand`-style error for `rm -rf /`).

- [ ] **Step 3: Implement** — in `components/terminal.tsx`:

Module level (below `initialHistory`):

```ts
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
```

Inside the component, a timed script player (timers cleaned up on unmount):

```ts
  const scriptTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const scriptLock = useRef(false)
  useEffect(() => () => scriptTimers.current.forEach(clearTimeout), [])

  const playScript = (lines: TerminalLine[], stepMs: number, onDone?: () => void) => {
    const finish = () => { scriptLock.current = false; onDone?.() }
    scriptLock.current = true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setHistory((prev) => [...prev, ...lines])
      finish()
      return
    }
    lines.forEach((line, i) => {
      scriptTimers.current.push(setTimeout(() => {
        setHistory((prev) => [...prev, line])
        if (i === lines.length - 1) finish()
      }, (i + 1) * stepMs))
    })
  }
```

In `handleCommand`, after the input echo and BEFORE game/dispatch handling:

```ts
    if (scriptLock.current) { setInput(''); return }

    if (/^rm\s+(-rf|-fr)\s+\/\s*$/.test(expandedCmd)) {
      playScript(MELTDOWN_LINES, 250, () => {
        scriptTimers.current.push(setTimeout(() => setHistory(initialHistory), 1200))
      })
      setInput('')
      return
    }

    if (expandedCmd === 'sl') {
      playScript(TRAIN_FRAME.map((content) => ({ type: 'output' as const, content })), 120)
      setInput('')
      return
    }
```

(Note: under reduced motion the reboot timeout still runs — in tests the
banner reappears within the 3s `waitFor`.)

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): sl train and rm -rf / meltdown easter eggs"`

---

### Task 8: `vim` trap

**Files:**
- Modify: `components/terminal.tsx`
- Test: append to `components/__tests__/terminal-easter-eggs.test.tsx`

- [ ] **Step 1: Write failing tests**:

```tsx
describe('vim trap', () => {
  it('traps the user until :q!', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'vim{Enter}')
    await waitFor(() => expect(screen.getByText(/VIM - Vi IMproved/)).toBeInTheDocument())
    await user.type(input, 'exit{Enter}')
    await waitFor(() => expect(screen.getByText(/E492: Not an editor command: exit/)).toBeInTheDocument())
    await user.type(input, ':q!{Enter}')
    await waitFor(() => expect(screen.getByText(/you are free now/)).toBeInTheDocument())
    // commands work again
    await user.type(input, 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (`command not found: vim`).

- [ ] **Step 3: Implement** — in the component:

```ts
  const [editorTrap, setEditorTrap] = useState(false)
```

In `handleCommand`, after the script-lock/meltdown/sl block:

```ts
    if (editorTrap) {
      if (/^:(q!?|wq|x)$/.test(expandedCmd)) {
        setEditorTrap(false)
        setHistory((prev) => [...prev, { type: 'success', content: 'you are free now. (this terminal only has one editor: your browser devtools)' }])
      } else {
        setHistory((prev) => [...prev, { type: 'error', content: `E492: Not an editor command: ${expandedCmd}` }])
      }
      setInput('')
      return
    }

    if (/^(vim|vi|nano|emacs)$/.test(expandedCmd)) {
      setEditorTrap(true)
      setHistory((prev) => [
        ...prev,
        { type: 'output', content: '' },
        { type: 'output', content: '~                    VIM - Vi IMproved' },
        { type: 'output', content: '~                     (sort of. not really.)' },
        { type: 'output', content: '~' },
        { type: 'output', content: "~        you're trapped. type :q! to escape" },
        { type: 'output', content: '' },
      ])
      setInput('')
      return
    }
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): vim trap easter egg"`

---

### Task 9: Konami code + hidden `phosphor` theme

**Files:**
- Modify: `lib/terminal-config.ts` (phosphor theme)
- Modify: `components/terminal.tsx` (Konami listener, unlock state, filtered theme list)
- Test: append to `components/__tests__/terminal-easter-eggs.test.tsx`

- [ ] **Step 1: Write failing tests**:

```tsx
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

describe('konami / phosphor', () => {
  it('phosphor is hidden from the theme list before unlock', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'theme{Enter}')
    await waitFor(() => expect(screen.getByText('Available themes:')).toBeInTheDocument())
    expect(screen.queryByText(/phosphor/)).not.toBeInTheDocument()
  })

  it('konami code unlocks phosphor', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    for (const key of KONAMI) fireEvent.keyDown(window, { key })
    await waitFor(() => expect(screen.getByText(/PHOSPHOR MODE UNLOCKED/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'theme phosphor{Enter}')
    await waitFor(() => expect(screen.getByText('Theme set to Phosphor')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify failure** — Expected: first passes trivially? NO — it must fail because `phosphor` doesn't exist yet, making `theme phosphor` an unknown theme. Confirm the second test FAILS.

- [ ] **Step 3: Implement**

`lib/terminal-config.ts` — add to `themes`:

```ts
  phosphor: {
    name: "Phosphor",
    background: "#050f05",
    foreground: "#c8facc",
    card: "#0a1a0a",
    primary: "#33ff66",
    muted: "#4d805d",
    accent: "#66ff99",
    destructive: "#ff5555",
    border: "#1a4d2a",
  },
```

`components/terminal.tsx`:

```ts
  const [phosphorUnlocked, setPhosphorUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('phosphor-unlocked') === 'true'
  })

  // Konami code listener
  useEffect(() => {
    const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a']
    let progress = 0
    const onKey = (e: globalThis.KeyboardEvent) => {
      progress = e.key.toLowerCase() === KONAMI[progress] ? progress + 1 : (e.key.toLowerCase() === KONAMI[0] ? 1 : 0)
      if (progress === KONAMI.length) {
        progress = 0
        setPhosphorUnlocked(true)
        localStorage.setItem('phosphor-unlocked', 'true')
        setHistory((prev) => [...prev, { type: 'success', content: '*** PHOSPHOR MODE UNLOCKED — try `theme phosphor` ***' }])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
```

In `buildExecuteContext`, the theme list filters the hidden theme:

```ts
    theme: {
      current: currentTheme,
      set: setTheme,
      list: () => (Object.keys(themes) as ThemeName[]).filter((t) => t !== 'phosphor' || phosphorUnlocked),
      config: (name) => themes[name],
    },
```

(The `theme` registry command validates against `list()`, so pre-unlock `theme phosphor` answers "Unknown theme".)

- [ ] **Step 4: Run to verify pass** — `npx vitest run components lib` — Expected: pass. Note: `lib/__tests__/terminal-config.test.ts` may assert a fixed theme count — update it to include phosphor if it fails.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): konami-unlocked phosphor theme"`

---

### Task 10: Help/man/completions sweep + full gate

**Files:**
- Modify: `lib/commands/commands/system.ts` (help text), `lib/commands/man-pages.ts`, `lib/terminal-config.ts` (`COMMAND_DESCRIPTIONS`), `components/terminal/types.ts` (`VALID_COMMANDS`), `components/terminal.tsx` (`getCompletions` if it has a command list)

- [ ] **Step 1: Update listings**
  - `help`: add `  Pipes          grep, head, tail, wc, sort (e.g. ls | grep dune)` under Navigation, and `history` to Other.
  - Man pages: add entries for `grep`, `head`, `tail`, `wc`, `sort`, `history`, `cowsay` (NAME/SYNOPSIS/DESCRIPTION/EXAMPLES in the existing format; pipes examples like `ls | grep dune`). Do NOT add `sl`, `vim`, or `rm -rf /` (discoverable, not documented).
  - `VALID_COMMANDS` (components/terminal/types.ts): add `grep`, `head`, `tail`, `wc`, `sort`, `history`, `cowsay` (syntax highlighting + palette).
  - `COMMAND_DESCRIPTIONS` (lib/terminal-config.ts): one-liners for the same seven.

- [ ] **Step 2: Run the full gate**

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
```

Expected: lint 0 errors/0 warnings, typecheck clean, all tests pass, build green. Fix anything that surfaces (e.g., a registry test asserting a fixed command count).

- [ ] **Step 3: Manual smoke** — `npm run dev`, then in the browser: `ls | grep books`, `history`, `!!`, type `cd b` and accept the ghost with →, `cowsay hi`, `sl`, `vim` → `:q!`, `rm -rf /`, Konami → `theme phosphor`.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(terminal): document pipes/history/cowsay in help, man, completions"`
