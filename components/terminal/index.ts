// Components
export { TerminalLine } from './TerminalLine'
export { HistoryDisplay } from './HistoryDisplay'
export { InputLine } from './InputLine'

// Syntax highlighting
export { tokenizeInput, renderTokens, highlightInput, highlightLine } from './SyntaxHighlighter'

// Types
export type { Token, TokenType, TerminalLineProps } from './types'
export type { HistoryDisplayProps } from './HistoryDisplay'
export type { InputLineHandle, InputLineProps } from './InputLine'
export { VALID_COMMANDS, HEADER_KEYWORDS } from './types'
