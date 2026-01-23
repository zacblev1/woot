/**
 * Trivia question data
 * Questions with q (question) and a (answer) format
 */

export interface TriviaQuestionData {
  q: string
  a: string
}

export const TRIVIA_QUESTIONS: TriviaQuestionData[] = [
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
