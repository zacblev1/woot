// Wordle word list - all 5-letter lowercase words
export const WORDLE_WORDS = [
  "apple", "beach", "crane", "dance", "eagle", "flame", "grape", "house", "input", "jelly",
  "knife", "lemon", "mango", "night", "ocean", "piano", "queen", "river", "stone", "tiger",
  "ultra", "vivid", "whale", "xenon", "yacht", "zebra", "brain", "charm", "dream", "frost",
  "ghost", "heart", "jolly", "karma", "laser", "medal", "noble", "orbit", "pride", "quest",
  "radar", "space", "train", "unity", "voice", "world", "youth", "blaze", "cloud", "drift"
] as const

export type WordleWord = typeof WORDLE_WORDS[number]
