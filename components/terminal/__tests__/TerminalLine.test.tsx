import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { tokenizeInput, renderTokens, highlightInput, highlightLine } from '../SyntaxHighlighter'
import { TerminalLine } from '../TerminalLine'
import { VALID_COMMANDS, HEADER_KEYWORDS } from '../types'

describe('tokenizeInput', () => {
  it('returns empty array for empty string', () => {
    const tokens = tokenizeInput('')
    expect(tokens).toEqual([])
  })

  it('tokenizes valid command as command type', () => {
    const tokens = tokenizeInput('ls')
    expect(tokens).toEqual([{ type: 'command', value: 'ls' }])
  })

  it('tokenizes invalid command as invalid type', () => {
    const tokens = tokenizeInput('xyz')
    expect(tokens).toEqual([{ type: 'invalid', value: 'xyz' }])
  })

  it('tokenizes command with argument', () => {
    const tokens = tokenizeInput('ls books')
    expect(tokens).toEqual([
      { type: 'command', value: 'ls' },
      { type: 'space', value: ' ' },
      { type: 'argument', value: 'books' },
    ])
  })

  it('tokenizes command with path argument', () => {
    const tokens = tokenizeInput('cd ~/books')
    expect(tokens).toEqual([
      { type: 'command', value: 'cd' },
      { type: 'space', value: ' ' },
      { type: 'path', value: '~/books' },
    ])
  })

  it('tokenizes flag after command', () => {
    const tokens = tokenizeInput('ls --help')
    expect(tokens).toEqual([
      { type: 'command', value: 'ls' },
      { type: 'space', value: ' ' },
      { type: 'flag', value: '--help' },
    ])
  })

  it('tokenizes short flag after command', () => {
    const tokens = tokenizeInput('ls -l')
    expect(tokens).toEqual([
      { type: 'command', value: 'ls' },
      { type: 'space', value: ' ' },
      { type: 'flag', value: '-l' },
    ])
  })

  it('tokenizes number after command', () => {
    const tokens = tokenizeInput('echo 42')
    expect(tokens).toEqual([
      { type: 'command', value: 'echo' },
      { type: 'space', value: ' ' },
      { type: 'number', value: '42' },
    ])
  })

  it('tokenizes quoted string', () => {
    const tokens = tokenizeInput('echo "hello"')
    expect(tokens).toEqual([
      { type: 'command', value: 'echo' },
      { type: 'space', value: ' ' },
      { type: 'string', value: '"hello"' },
    ])
  })

  it('tokenizes single-quoted string', () => {
    const tokens = tokenizeInput("echo 'world'")
    expect(tokens).toEqual([
      { type: 'command', value: 'echo' },
      { type: 'space', value: ' ' },
      { type: 'string', value: "'world'" },
    ])
  })

  it('tokenizes path with dot', () => {
    const tokens = tokenizeInput('cat ./file.txt')
    expect(tokens).toEqual([
      { type: 'command', value: 'cat' },
      { type: 'space', value: ' ' },
      { type: 'path', value: './file.txt' },
    ])
  })

  it('uses provided validCommands array', () => {
    const tokens = tokenizeInput('custom', ['custom'])
    expect(tokens).toEqual([{ type: 'command', value: 'custom' }])
  })

  it('handles multiple spaces', () => {
    const tokens = tokenizeInput('ls   books')
    expect(tokens).toEqual([
      { type: 'command', value: 'ls' },
      { type: 'space', value: '   ' },
      { type: 'argument', value: 'books' },
    ])
  })

  it('handles complex command line', () => {
    const tokens = tokenizeInput('search --type book "dune" 42')
    expect(tokens).toEqual([
      { type: 'command', value: 'search' },
      { type: 'space', value: ' ' },
      { type: 'flag', value: '--type' },
      { type: 'space', value: ' ' },
      { type: 'argument', value: 'book' },
      { type: 'space', value: ' ' },
      { type: 'string', value: '"dune"' },
      { type: 'space', value: ' ' },
      { type: 'number', value: '42' },
    ])
  })
})

describe('renderTokens', () => {
  it('renders command token with accent styling', () => {
    const tokens = [{ type: 'command' as const, value: 'ls' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('ls')
    expect(span).toHaveClass('text-accent', 'font-semibold')
  })

  it('renders invalid token with destructive styling', () => {
    const tokens = [{ type: 'invalid' as const, value: 'xyz' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('xyz')
    expect(span).toHaveClass('text-destructive')
  })

  it('renders path token with primary styling', () => {
    const tokens = [{ type: 'path' as const, value: '~/books' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('~/books')
    expect(span).toHaveClass('text-primary')
  })

  it('renders string token with yellow styling', () => {
    const tokens = [{ type: 'string' as const, value: '"hello"' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('"hello"')
    expect(span).toHaveClass('text-yellow-400')
  })

  it('renders flag token with purple styling', () => {
    const tokens = [{ type: 'flag' as const, value: '--help' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('--help')
    expect(span).toHaveClass('text-purple-400')
  })

  it('renders number token with orange styling', () => {
    const tokens = [{ type: 'number' as const, value: '42' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('42')
    expect(span).toHaveClass('text-orange-400')
  })

  it('renders argument token with muted styling', () => {
    const tokens = [{ type: 'argument' as const, value: 'books' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const span = screen.getByText('books')
    expect(span).toHaveClass('text-muted-foreground')
  })

  it('renders space token without styling', () => {
    const tokens = [{ type: 'space' as const, value: ' ' }]
    render(<div data-testid="tokens">{renderTokens(tokens)}</div>)
    const container = screen.getByTestId('tokens')
    expect(container.textContent).toBe(' ')
  })
})

describe('highlightInput', () => {
  it('highlights valid command in prompt', () => {
    render(<div data-testid="input">{highlightInput('~/books $ ls')}</div>)
    expect(screen.getByText('~/books $')).toHaveClass('text-muted-foreground')
    expect(screen.getByText('ls')).toHaveClass('text-accent', 'font-semibold')
  })

  it('highlights invalid command with destructive styling', () => {
    render(<div data-testid="input">{highlightInput('~/books $ invalid')}</div>)
    expect(screen.getByText('invalid')).toHaveClass('text-destructive')
  })

  it('highlights command with arguments', () => {
    render(<div data-testid="input">{highlightInput('~ $ ls books')}</div>)
    // Prompt includes trailing space, use regex to match
    expect(screen.getByText(/~\s+\$/)).toHaveClass('text-muted-foreground')
    expect(screen.getByText('ls')).toHaveClass('text-accent', 'font-semibold')
    // Args include leading space, use regex to match
    expect(screen.getByText(/books/)).toHaveClass('text-foreground')
  })

  it('returns plain text when no match', () => {
    render(<div data-testid="input">{highlightInput('no prompt here')}</div>)
    expect(screen.getByTestId('input').textContent).toBe('no prompt here')
  })

  it('handles prompt with no command', () => {
    render(<div data-testid="input">{highlightInput('~/books $ ')}</div>)
    expect(screen.getByText(/~/)).toHaveClass('text-muted-foreground')
  })
})

describe('highlightLine', () => {
  it('highlights header keywords with accent and bold', () => {
    render(<div data-testid="line">{highlightLine('NAME')}</div>)
    const span = screen.getByText('NAME')
    expect(span).toHaveClass('text-accent', 'font-bold')
  })

  it('highlights all header keywords', () => {
    HEADER_KEYWORDS.forEach((keyword) => {
      const { unmount } = render(<div data-testid="line">{highlightLine(keyword)}</div>)
      const span = screen.getByText(keyword)
      expect(span).toHaveClass('text-accent', 'font-bold')
      unmount()
    })
  })

  it('highlights label:value format', () => {
    render(<div data-testid="line">{highlightLine('  Author:  Herbert')}</div>)
    expect(screen.getByText('Author:')).toHaveClass('text-accent')
    expect(screen.getByText('Herbert')).toHaveClass('text-foreground')
  })

  it('highlights path in line', () => {
    render(<div data-testid="line">{highlightLine('Located at ~/books')}</div>)
    expect(screen.getByText('~/books')).toHaveClass('text-primary')
  })

  it('highlights /home paths', () => {
    render(<div data-testid="line">{highlightLine('Path: /home/user/file')}</div>)
    expect(screen.getByText('/home/user/file')).toHaveClass('text-primary')
  })

  it('highlights <argument> with muted styling', () => {
    render(<div data-testid="line">{highlightLine('Usage: cmd <arg>')}</div>)
    expect(screen.getByText('<arg>')).toHaveClass('text-muted-foreground')
  })

  it('highlights [optional] with muted styling', () => {
    render(<div data-testid="line">{highlightLine('Usage: cmd [option]')}</div>)
    expect(screen.getByText('[option]')).toHaveClass('text-muted-foreground')
  })

  it('returns plain text for unmatched content', () => {
    render(<div data-testid="line">{highlightLine('Just plain text')}</div>)
    expect(screen.getByTestId('line').textContent).toBe('Just plain text')
  })

  it('returns empty string as-is', () => {
    const result = highlightLine('')
    expect(result).toBe('')
  })

  it('returns whitespace-only string as-is', () => {
    const result = highlightLine('   ')
    expect(result).toBe('   ')
  })
})

describe('TerminalLine component', () => {
  it('renders input type with highlightInput', () => {
    render(<TerminalLine line={{ type: 'input', content: '~ $ ls' }} />)
    expect(screen.getByText('ls')).toHaveClass('text-accent', 'font-semibold')
  })

  it('renders output type with highlightLine', () => {
    render(<TerminalLine line={{ type: 'output', content: 'NAME' }} />)
    expect(screen.getByText('NAME')).toHaveClass('text-accent', 'font-bold')
  })

  it('renders error type with destructive class', () => {
    render(<TerminalLine line={{ type: 'error', content: 'Error message' }} />)
    const container = screen.getByText('Error message').closest('div')
    expect(container).toHaveClass('text-destructive')
  })

  it('renders success type with accent class', () => {
    render(<TerminalLine line={{ type: 'success', content: 'Success!' }} />)
    const container = screen.getByText('Success!').closest('div')
    expect(container).toHaveClass('text-accent')
  })

  it('renders link type with clickable anchor', () => {
    render(
      <TerminalLine
        line={{ type: 'link', content: 'Click here', href: 'https://example.com' }}
      />
    )
    const link = screen.getByRole('link', { name: 'Click here' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('hover:text-primary', 'hover:underline')
  })

  it('renders link without href as plain text', () => {
    render(<TerminalLine line={{ type: 'link', content: 'No href link' }} />)
    expect(screen.getByText('No href link')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders wordle type with colored letters', () => {
    render(<TerminalLine line={{ type: 'wordle', content: 'X:A,?:B, :C' }} />)
    const letterA = screen.getByText('A')
    const letterB = screen.getByText('B')
    const letterC = screen.getByText('C')
    expect(letterA).toHaveClass('text-green-400', 'font-bold')
    expect(letterB).toHaveClass('text-yellow-400', 'font-bold')
    expect(letterC).toHaveClass('text-muted-foreground', 'font-bold')
  })

  it('has base styling classes', () => {
    render(<TerminalLine line={{ type: 'output', content: 'Test' }} />)
    const container = screen.getByText('Test').closest('div')
    expect(container).toHaveClass('whitespace-pre-wrap', 'break-words', 'break-all')
  })
})

describe('constants', () => {
  it('exports VALID_COMMANDS array', () => {
    expect(VALID_COMMANDS).toContain('ls')
    expect(VALID_COMMANDS).toContain('cd')
    expect(VALID_COMMANDS).toContain('help')
    expect(VALID_COMMANDS.length).toBeGreaterThan(20)
  })

  it('exports HEADER_KEYWORDS array', () => {
    expect(HEADER_KEYWORDS).toContain('NAME')
    expect(HEADER_KEYWORDS).toContain('SYNOPSIS')
    expect(HEADER_KEYWORDS).toContain('DESCRIPTION')
    expect(HEADER_KEYWORDS.length).toBeGreaterThan(10)
  })
})
