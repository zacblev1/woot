import type { GameResult } from '../types'

/**
 * Card representation for blackjack
 */
export interface Card {
  suit: string  // Unicode suit symbol: ♠, ♥, ♦, ♣
  value: string // A, 2-10, J, Q, K
  display: string // Combined display e.g. "A♠"
}

/**
 * Blackjack game data structure
 */
export interface BlackjackData {
  deck: Card[]
  playerHand: Card[]
  dealerHand: Card[]
  phase: 'player' | 'dealer' | 'finished'
}

const SUITS = ['♠', '♥', '♦', '♣'] as const
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

/**
 * Create a new shuffled deck of 52 cards.
 */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        suit,
        value,
        display: `${value}${suit}`
      })
    }
  }
  // Shuffle deck
  return deck.sort(() => Math.random() - 0.5)
}

/**
 * Get the numeric value of a single card.
 * Aces are worth 11 (adjusted later if bust).
 */
export function cardValue(card: Card): number {
  if (card.value === 'A') return 11
  if (['K', 'Q', 'J'].includes(card.value)) return 10
  return parseInt(card.value, 10)
}

/**
 * Calculate the value of a hand.
 * Reduces aces from 11 to 1 while bust (>21).
 */
export function handValue(hand: Card[]): number {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0)
  let aces = hand.filter(c => c.value === 'A').length

  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }

  return total
}

/**
 * Format a hand for display.
 */
function formatHand(hand: Card[]): string {
  return hand.map(c => c.display).join(' ')
}

/**
 * Create initial data for a new blackjack game.
 * Deals 2 cards each to player and dealer.
 */
export function createInitialData(): BlackjackData {
  const deck = createDeck()
  const playerHand = [deck.pop()!, deck.pop()!]
  const dealerHand = [deck.pop()!, deck.pop()!]

  return {
    deck,
    playerHand,
    dealerHand,
    phase: 'player'
  }
}

/**
 * Get the start message displayed when the game begins.
 */
export function getStartMessage(data: BlackjackData): string[] {
  return [
    '',
    'BLACKJACK',
    'Commands: hit, stand, quit',
    '',
    `Dealer: ${data.dealerHand[0].display} [?]`,
    `You: ${formatHand(data.playerHand)} (${handValue(data.playerHand)})`,
    '',
  ]
}

/**
 * Handle user input for the blackjack game.
 * Pure function - takes input and current data, returns result.
 */
export function handleInput(input: string, data: BlackjackData): GameResult {
  const cmd = input.toLowerCase().trim()
  const { deck, playerHand, dealerHand, phase } = data

  // Handle quit command
  if (cmd === 'quit') {
    return {
      output: 'Left the table.',
      endGame: true
    }
  }

  if (phase === 'player') {
    if (cmd === 'hit') {
      const newCard = deck[deck.length - 1]
      const newDeck = deck.slice(0, -1)
      const newHand = [...playerHand, newCard]
      const total = handValue(newHand)

      if (total > 21) {
        // Player busts
        return {
          output: [
            `You draw: ${newCard.display}`,
            `You: ${formatHand(newHand)} (${total})`,
            '',
            'BUST! Dealer wins.',
            '',
          ],
          updatedData: {
            deck: newDeck,
            playerHand: newHand,
            phase: 'finished'
          },
          endGame: true
        }
      }

      // Continue playing
      return {
        output: [
          `You draw: ${newCard.display}`,
          `You: ${formatHand(newHand)} (${total})`,
        ],
        updatedData: {
          deck: newDeck,
          playerHand: newHand
        }
      }
    }

    if (cmd === 'stand') {
      // Dealer's turn - draw until >= 17
      const dHand = [...dealerHand]
      let dDeck = [...deck]

      while (handValue(dHand) < 17) {
        dHand.push(dDeck[dDeck.length - 1])
        dDeck = dDeck.slice(0, -1)
      }

      const playerTotal = handValue(playerHand)
      const dealerTotal = handValue(dHand)

      let result = ''
      if (dealerTotal > 21) {
        result = 'Dealer busts. You win!'
      } else if (dealerTotal > playerTotal) {
        result = 'Dealer wins.'
      } else if (playerTotal > dealerTotal) {
        result = 'You win!'
      } else {
        result = 'Push (tie).'
      }

      return {
        output: [
          '',
          `Dealer: ${formatHand(dHand)} (${dealerTotal})`,
          `You: ${formatHand(playerHand)} (${playerTotal})`,
          '',
          result,
          '',
        ],
        updatedData: {
          deck: dDeck,
          dealerHand: dHand,
          phase: 'finished'
        },
        endGame: true
      }
    }

    // Invalid command during player phase
    return {
      output: 'Commands: hit, stand, quit',
      outputType: 'error'
    }
  }

  // Invalid game state
  return {
    output: 'Invalid game state.',
    outputType: 'error'
  }
}
