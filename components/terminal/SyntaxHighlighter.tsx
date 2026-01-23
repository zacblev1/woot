import type { ReactNode } from 'react'
import type { Token, TokenType } from './types'
import { VALID_COMMANDS, HEADER_KEYWORDS } from './types'

/**
 * Tokenize input string for syntax highlighting.
 * Pure function - no React dependencies.
 *
 * @param input - The input string to tokenize
 * @param validCommands - Array of valid command names
 * @returns Array of tokens with type and value
 */
export function tokenizeInput(input: string, validCommands: string[] = [...VALID_COMMANDS]): Token[] {
  const tokens: Token[] = []
  let remaining = input
  let isFirstToken = true

  while (remaining.length > 0) {
    // Match leading whitespace
    const wsMatch = remaining.match(/^(\s+)/)
    if (wsMatch) {
      tokens.push({ type: 'space', value: wsMatch[1] })
      remaining = remaining.slice(wsMatch[1].length)
      continue
    }

    // Match quoted strings
    const quoteMatch = remaining.match(/^(["'])([^"']*)(["'])?/)
    if (quoteMatch) {
      tokens.push({ type: 'string', value: quoteMatch[0] })
      remaining = remaining.slice(quoteMatch[0].length)
      isFirstToken = false
      continue
    }

    // Match flags (--flag or -f) - only after first token
    const flagMatch = remaining.match(/^(--?\w+)/)
    if (flagMatch && !isFirstToken) {
      tokens.push({ type: 'flag', value: flagMatch[1] })
      remaining = remaining.slice(flagMatch[1].length)
      continue
    }

    // Match numbers - only after first token and followed by space or end
    const numMatch = remaining.match(/^(\d+)(?=\s|$)/)
    if (numMatch && !isFirstToken) {
      tokens.push({ type: 'number', value: numMatch[1] })
      remaining = remaining.slice(numMatch[1].length)
      continue
    }

    // Match paths (contains / or starts with ~ or .) - only after first token
    const pathMatch = remaining.match(/^([~.]?[\w\-./]+)/)
    if (
      pathMatch &&
      !isFirstToken &&
      (pathMatch[1].includes('/') || pathMatch[1].startsWith('~') || pathMatch[1].startsWith('.'))
    ) {
      tokens.push({ type: 'path', value: pathMatch[1] })
      remaining = remaining.slice(pathMatch[1].length)
      continue
    }

    // Match word (command or argument)
    const wordMatch = remaining.match(/^(\S+)/)
    if (wordMatch) {
      if (isFirstToken) {
        const isValid = validCommands.includes(wordMatch[1].toLowerCase())
        tokens.push({ type: isValid ? 'command' : 'invalid', value: wordMatch[1] })
        isFirstToken = false
      } else {
        tokens.push({ type: 'argument', value: wordMatch[1] })
      }
      remaining = remaining.slice(wordMatch[1].length)
      continue
    }

    // Fallback: single character
    tokens.push({ type: 'text', value: remaining[0] })
    remaining = remaining.slice(1)
  }

  return tokens
}

/**
 * Get CSS class for a token type.
 */
function getTokenColorClass(type: TokenType): string {
  switch (type) {
    case 'command':
      return 'text-accent font-semibold'
    case 'invalid':
      return 'text-destructive'
    case 'path':
      return 'text-primary'
    case 'string':
      return 'text-yellow-400'
    case 'flag':
      return 'text-purple-400'
    case 'number':
      return 'text-orange-400'
    case 'argument':
      return 'text-muted-foreground'
    default:
      return ''
  }
}

/**
 * Render tokens as highlighted spans.
 */
export function renderTokens(tokens: Token[]): ReactNode {
  return tokens.map((token, i) => {
    const colorClass = getTokenColorClass(token.type)
    return (
      <span key={i} className={colorClass || undefined}>
        {token.value}
      </span>
    )
  })
}

/**
 * Highlight input lines (prompt + command).
 * Format: "~/path $ command args"
 */
export function highlightInput(text: string): ReactNode {
  // Input format: "~/path $ command args"
  const match = text.match(/^(.*?\$\s*)(\S+)?(\s.*)?$/)
  if (!match) return text

  const [, prompt, command, args] = match
  const isValid = command ? VALID_COMMANDS.includes(command.toLowerCase() as (typeof VALID_COMMANDS)[number]) : false

  return (
    <>
      <span className="text-muted-foreground">{prompt}</span>
      {command && (
        <span className={isValid ? 'text-accent font-semibold' : 'text-destructive'}>{command}</span>
      )}
      {args && <span className="text-foreground">{args}</span>}
    </>
  )
}

/**
 * Syntax highlighting for terminal output lines.
 * Handles headers, labels, paths, and inline arguments.
 */
export function highlightLine(text: string): ReactNode {
  if (!text || text.trim() === '') return text

  // Check for section headers (entire line is a header keyword)
  const trimmed = text.trim()
  if (HEADER_KEYWORDS.includes(trimmed as (typeof HEADER_KEYWORDS)[number])) {
    return <span className="text-accent font-bold">{text}</span>
  }

  // Check for label lines (indented "Label:  value" format, like in view output)
  // Must start with spaces, then a capitalized word, then colon, then spaces, then value
  const labelMatch = text.match(/^(\s{2,})([\w]+)(:)(\s{2,})(.+)$/)
  if (labelMatch) {
    const [, indent, label, colon, space, value] = labelMatch
    return (
      <>
        {indent}
        <span className="text-accent">
          {label}
          {colon}
        </span>
        {space}
        <span className="text-foreground">{value}</span>
      </>
    )
  }

  // Build highlighted parts for inline patterns
  const parts: ReactNode[] = []
  let key = 0

  // Match paths, arguments in brackets, and standalone numbers
  const inlineRegex = /(~\/[\w\-\/]*|\/home\/[\w\-\/]+|<[\w\s\-\.]+>|\[[\w\-\.]+\])/g
  let lastIdx = 0
  let inlineMatch

  while ((inlineMatch = inlineRegex.exec(text)) !== null) {
    // Text before match
    if (inlineMatch.index > lastIdx) {
      parts.push(text.slice(lastIdx, inlineMatch.index))
    }

    const matched = inlineMatch[0]
    if (matched.startsWith('~/') || matched.startsWith('/home/')) {
      parts.push(
        <span key={key++} className="text-primary">
          {matched}
        </span>
      )
    } else if (matched.startsWith('<')) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {matched}
        </span>
      )
    } else if (matched.startsWith('[')) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {matched}
        </span>
      )
    } else {
      parts.push(matched)
    }

    lastIdx = inlineRegex.lastIndex
  }

  // Remaining text
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  // If no matches were found, return original text
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string')) {
    return text
  }

  return <>{parts}</>
}
