export const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump!',
  'Sphinx of black quartz, judge my vow.',
  'The five boxing wizards jump quickly.',
  'Crazy Fredrick bought many very exquisite opal jewels.',
  'We promptly judged antique ivory buckles for the next prize.',
  'A wizard’s job is to vex chumps quickly in fog.',
  'Jaded zombies acted quaintly but kept driving their oxen forward.',
  'The job requires extra pluck and zeal from every young wage earner.',
  'Just keep examining every low bid quoted for zinc etchings.',
  'Amazingly few discotheques provide jukeboxes.',
] as const

export interface RoundResult {
  wpm: number
  accuracy: number
}

/** Deterministic LCG so a seed always yields the same distinct picks. */
export function pickSentences(seed: number, count = 3): string[] {
  let state = (seed >>> 0) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }
  const pool = [...SENTENCES]
  const picked: string[] = []
  while (picked.length < Math.min(count, pool.length)) {
    const i = next() % pool.length
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
}

/** Words-per-minute with the conventional 5-chars-per-word. */
export function wpm(typedLength: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return (typedLength / 5) / (elapsedMs / 60_000)
}

/** Per-character comparison over the longer of the two strings (0..1). */
export function accuracy(target: string, typed: string): number {
  const length = Math.max(target.length, typed.length)
  if (length === 0) return 1
  let matches = 0
  for (let i = 0; i < Math.min(target.length, typed.length); i++) {
    if (target[i] === typed[i]) matches++
  }
  return matches / length
}

export function finalScore(rounds: RoundResult[]): number {
  if (rounds.length === 0) return 0
  const avgWpm = rounds.reduce((s, r) => s + r.wpm, 0) / rounds.length
  const avgAcc = rounds.reduce((s, r) => s + r.accuracy, 0) / rounds.length
  return avgWpm * avgAcc
}

/** Integer score persisted to the API (WPM×accuracy×100). */
export function submittedScore(rounds: RoundResult[]): number {
  return Math.round(finalScore(rounds) * 100)
}
