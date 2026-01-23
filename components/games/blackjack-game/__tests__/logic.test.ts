import { describe, it, expect } from 'vitest'
import {
  createDeck,
  cardValue,
  handValue,
  createInitialData,
  getStartMessage,
  handleInput,
  type Card,
  type BlackjackData
} from '../logic'

// Helper to create a card
function card(value: string, suit: string = '♠'): Card {
  return { value, suit, display: `${value}${suit}` }
}

describe('blackjack-game', () => {
  describe('createDeck', () => {
    it('returns 52 cards', () => {
      const deck = createDeck()
      expect(deck).toHaveLength(52)
    })

    it('has 4 cards of each value', () => {
      const deck = createDeck()
      const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
      values.forEach(val => {
        const count = deck.filter(c => c.value === val).length
        expect(count).toBe(4)
      })
    })

    it('has 13 cards of each suit', () => {
      const deck = createDeck()
      const suits = ['♠', '♥', '♦', '♣']
      suits.forEach(suit => {
        const count = deck.filter(c => c.suit === suit).length
        expect(count).toBe(13)
      })
    })

    it('has unique cards', () => {
      const deck = createDeck()
      const displays = deck.map(c => c.display)
      const unique = new Set(displays)
      expect(unique.size).toBe(52)
    })
  })

  describe('cardValue', () => {
    it('returns 11 for Ace', () => {
      expect(cardValue(card('A'))).toBe(11)
    })

    it('returns 10 for face cards', () => {
      expect(cardValue(card('K'))).toBe(10)
      expect(cardValue(card('Q'))).toBe(10)
      expect(cardValue(card('J'))).toBe(10)
    })

    it('returns numeric value for number cards', () => {
      expect(cardValue(card('2'))).toBe(2)
      expect(cardValue(card('5'))).toBe(5)
      expect(cardValue(card('9'))).toBe(9)
      expect(cardValue(card('10'))).toBe(10)
    })
  })

  describe('handValue', () => {
    it('calculates simple hand correctly', () => {
      const hand = [card('5'), card('7')]
      expect(handValue(hand)).toBe(12)
    })

    it('calculates hand with face cards correctly', () => {
      const hand = [card('K'), card('7')]
      expect(handValue(hand)).toBe(17)
    })

    it('calculates Ace as 11 when not bust', () => {
      const hand = [card('A'), card('7')]
      expect(handValue(hand)).toBe(18)
    })

    it('reduces Ace from 11 to 1 when bust', () => {
      // A + 10 + 5 = 26, but with Ace reduction = 16
      const hand = [card('A'), card('10'), card('5')]
      expect(handValue(hand)).toBe(16)
    })

    it('reduces multiple Aces when bust', () => {
      // A + A + 9 = 31, reduce first Ace = 21, keep as is
      const hand = [card('A'), card('A'), card('9')]
      expect(handValue(hand)).toBe(21)
    })

    it('reduces both Aces if needed', () => {
      // A + A + A + 9 = 42, reduce all = 12
      const hand = [card('A'), card('A'), card('A'), card('9')]
      expect(handValue(hand)).toBe(12)
    })

    it('handles blackjack (A + 10)', () => {
      const hand = [card('A'), card('K')]
      expect(handValue(hand)).toBe(21)
    })
  })

  describe('createInitialData', () => {
    it('deals 2 cards to player and dealer', () => {
      const data = createInitialData()
      expect(data.playerHand).toHaveLength(2)
      expect(data.dealerHand).toHaveLength(2)
    })

    it('has remaining deck of 48 cards', () => {
      const data = createInitialData()
      expect(data.deck).toHaveLength(48)
    })

    it('starts in player phase', () => {
      const data = createInitialData()
      expect(data.phase).toBe('player')
    })

    it('deals different cards to player and dealer', () => {
      const data = createInitialData()
      const allCards = [...data.playerHand, ...data.dealerHand]
      const displays = allCards.map(c => c.display)
      const unique = new Set(displays)
      expect(unique.size).toBe(4) // All 4 dealt cards should be unique
    })
  })

  describe('getStartMessage', () => {
    it('returns array with BLACKJACK header', () => {
      const data = createInitialData()
      const msg = getStartMessage(data)
      expect(Array.isArray(msg)).toBe(true)
      expect(msg).toContain('BLACKJACK')
    })

    it('includes commands instruction', () => {
      const data = createInitialData()
      const msg = getStartMessage(data)
      expect(msg.some(line => line.includes('hit'))).toBe(true)
      expect(msg.some(line => line.includes('stand'))).toBe(true)
    })

    it('shows dealer first card with hidden second', () => {
      const data: BlackjackData = {
        deck: [],
        playerHand: [card('7'), card('8')],
        dealerHand: [card('K'), card('A')],
        phase: 'player'
      }
      const msg = getStartMessage(data)
      expect(msg.some(line => line.includes('Dealer: K♠ [?]'))).toBe(true)
    })

    it('shows player hand with value', () => {
      const data: BlackjackData = {
        deck: [],
        playerHand: [card('7'), card('8')],
        dealerHand: [card('K'), card('A')],
        phase: 'player'
      }
      const msg = getStartMessage(data)
      expect(msg.some(line => line.includes('You: 7♠ 8♠ (15)'))).toBe(true)
    })
  })

  describe('handleInput', () => {
    it('handles quit command', () => {
      const data = createInitialData()
      const result = handleInput('quit', data)
      expect(result.endGame).toBe(true)
      expect(result.output).toBe('Left the table.')
    })

    it('handles QUIT command (case insensitive)', () => {
      const data = createInitialData()
      const result = handleInput('QUIT', data)
      expect(result.endGame).toBe(true)
    })

    describe('hit command', () => {
      it('adds a card to player hand', () => {
        const data: BlackjackData = {
          deck: [card('3')],
          playerHand: [card('7'), card('5')],
          dealerHand: [card('K'), card('A')],
          phase: 'player'
        }
        const result = handleInput('hit', data)
        expect(result.updatedData?.playerHand).toHaveLength(3)
        expect((result.output as string[]).some(line => line.includes('You draw: 3♠'))).toBe(true)
      })

      it('detects bust when over 21', () => {
        const data: BlackjackData = {
          deck: [card('K')],
          playerHand: [card('10'), card('8')],
          dealerHand: [card('K'), card('A')],
          phase: 'player'
        }
        const result = handleInput('hit', data)
        expect(result.endGame).toBe(true)
        expect((result.output as string[]).some(line => line.includes('BUST'))).toBe(true)
      })

      it('updates deck after drawing', () => {
        const data: BlackjackData = {
          deck: [card('2'), card('3')],
          playerHand: [card('7'), card('5')],
          dealerHand: [card('K'), card('A')],
          phase: 'player'
        }
        const result = handleInput('hit', data)
        expect(result.updatedData?.deck).toHaveLength(1)
      })
    })

    describe('stand command', () => {
      it('triggers dealer play', () => {
        const data: BlackjackData = {
          deck: [],
          playerHand: [card('10'), card('7')],
          dealerHand: [card('10'), card('8')],
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect(result.endGame).toBe(true)
        expect((result.output as string[]).some(line => line.includes('Dealer:'))).toBe(true)
      })

      it('dealer draws until >= 17', () => {
        const data: BlackjackData = {
          deck: [card('10')],
          playerHand: [card('10'), card('7')],
          dealerHand: [card('10'), card('5')], // 15, needs to draw
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect(result.updatedData?.dealerHand).toHaveLength(3)
      })

      it('player wins when higher', () => {
        const data: BlackjackData = {
          deck: [],
          playerHand: [card('10'), card('K')], // 20
          dealerHand: [card('10'), card('8')], // 18
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect((result.output as string[]).some(line => line.includes('You win!'))).toBe(true)
      })

      it('dealer wins when higher', () => {
        const data: BlackjackData = {
          deck: [],
          playerHand: [card('10'), card('5')], // 15
          dealerHand: [card('10'), card('8')], // 18
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect((result.output as string[]).some(line => line.includes('Dealer wins.'))).toBe(true)
      })

      it('push on tie', () => {
        const data: BlackjackData = {
          deck: [],
          playerHand: [card('10'), card('8')], // 18
          dealerHand: [card('10'), card('8')], // 18
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect((result.output as string[]).some(line => line.includes('Push (tie).'))).toBe(true)
      })

      it('player wins when dealer busts', () => {
        const data: BlackjackData = {
          deck: [card('10')],
          playerHand: [card('10'), card('5')], // 15
          dealerHand: [card('10'), card('6')], // 16 -> draws 10 -> 26 bust
          phase: 'player'
        }
        const result = handleInput('stand', data)
        expect((result.output as string[]).some(line => line.includes('Dealer busts. You win!'))).toBe(true)
      })
    })

    it('returns error for invalid command', () => {
      const data = createInitialData()
      const result = handleInput('invalid', data)
      expect(result.outputType).toBe('error')
      expect(result.output).toBe('Commands: hit, stand, quit')
    })

    it('trims whitespace from input', () => {
      const data = createInitialData()
      const result = handleInput('  quit  ', data)
      expect(result.endGame).toBe(true)
    })
  })
})
