import { describe, it, expect } from 'vitest'
import { createInitialData, getStartMessage, handleInput, type TriviaData } from '../logic'
import { TRIVIA_QUESTIONS } from '../questions'

describe('trivia-game', () => {
  describe('TRIVIA_QUESTIONS', () => {
    it('has at least 5 questions', () => {
      expect(TRIVIA_QUESTIONS.length).toBeGreaterThanOrEqual(5)
    })

    it('all questions have q and a properties', () => {
      TRIVIA_QUESTIONS.forEach(q => {
        expect(q.q).toBeDefined()
        expect(typeof q.q).toBe('string')
        expect(q.a).toBeDefined()
        expect(typeof q.a).toBe('string')
      })
    })

    it('all answers are lowercase', () => {
      TRIVIA_QUESTIONS.forEach(q => {
        expect(q.a).toBe(q.a.toLowerCase())
      })
    })
  })

  describe('createInitialData', () => {
    it('returns 5 shuffled questions', () => {
      const data = createInitialData()
      expect(data.questions).toHaveLength(5)
      expect(data.current).toBe(0)
      expect(data.score).toBe(0)
    })

    it('selects questions from TRIVIA_QUESTIONS', () => {
      const data = createInitialData()
      data.questions.forEach(q => {
        expect(TRIVIA_QUESTIONS).toContainEqual(q)
      })
    })

    it('shuffles questions (produces different orders)', () => {
      // Run multiple times and check that not all are identical
      const results: TriviaData[] = []
      for (let i = 0; i < 10; i++) {
        results.push(createInitialData())
      }

      // Check that at least one differs in first question
      const firstQuestions = results.map(r => r.questions[0].q)
      const uniqueFirsts = new Set(firstQuestions)
      // With randomness, we should see at least 2 different first questions in 10 tries
      expect(uniqueFirsts.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getStartMessage', () => {
    it('returns array with TRIVIA header', () => {
      const data = createInitialData()
      const msg = getStartMessage(data)
      expect(Array.isArray(msg)).toBe(true)
      expect(msg).toContain('TRIVIA')
    })

    it('includes quit instructions', () => {
      const data = createInitialData()
      const msg = getStartMessage(data)
      expect(msg.some(line => line.includes('quit'))).toBe(true)
    })

    it('includes first question', () => {
      const data: TriviaData = {
        questions: [{ q: 'Test question?', a: 'answer' }],
        current: 0,
        score: 0
      }
      const msg = getStartMessage(data)
      expect(msg.some(line => line.includes('Q1:'))).toBe(true)
      expect(msg.some(line => line.includes('Test question?'))).toBe(true)
    })
  })

  describe('handleInput', () => {
    const baseData: TriviaData = {
      questions: [
        { q: 'Q1?', a: 'answer1' },
        { q: 'Q2?', a: 'answer2' },
        { q: 'Q3?', a: 'answer3' },
        { q: 'Q4?', a: 'answer4' },
        { q: 'Q5?', a: 'answer5' },
      ],
      current: 0,
      score: 0
    }

    it('handles quit command', () => {
      const result = handleInput('quit', baseData)
      expect(result.endGame).toBe(true)
      expect(result.output).toBe('Trivia ended.')
    })

    it('handles QUIT command (case insensitive)', () => {
      const result = handleInput('QUIT', baseData)
      expect(result.endGame).toBe(true)
    })

    it('correct answer increments score', () => {
      const result = handleInput('answer1', baseData)
      expect(result.updatedData?.score).toBe(1)
      expect(Array.isArray(result.output)).toBe(true)
      expect((result.output as string[])[0]).toBe('Correct!')
    })

    it('correct answer is case insensitive', () => {
      const result = handleInput('ANSWER1', baseData)
      expect(result.updatedData?.score).toBe(1)
      expect((result.output as string[])[0]).toBe('Correct!')
    })

    it('wrong answer shows correct answer', () => {
      const result = handleInput('wronganswer', baseData)
      expect(result.updatedData?.score).toBe(0)
      expect(Array.isArray(result.output)).toBe(true)
      expect((result.output as string[])[0]).toBe('Wrong. Answer: answer1')
    })

    it('advances to next question after correct answer', () => {
      const result = handleInput('answer1', baseData)
      expect(result.updatedData?.current).toBe(1)
      expect((result.output as string[]).some(line => line.includes('Q2'))).toBe(true)
    })

    it('advances to next question after wrong answer', () => {
      const result = handleInput('wrong', baseData)
      expect(result.updatedData?.current).toBe(1)
      expect((result.output as string[]).some(line => line.includes('Q2'))).toBe(true)
    })

    it('ends game after 5 questions with final score', () => {
      const lastQuestionData: TriviaData = {
        questions: baseData.questions,
        current: 4,
        score: 3
      }

      const result = handleInput('answer5', lastQuestionData)
      expect(result.endGame).toBe(true)
      expect(result.updatedData?.score).toBe(4)
      expect((result.output as string[]).some(line => line.includes('Final score: 4/5'))).toBe(true)
    })

    it('ends game after last wrong answer with final score', () => {
      const lastQuestionData: TriviaData = {
        questions: baseData.questions,
        current: 4,
        score: 2
      }

      const result = handleInput('wronganswer', lastQuestionData)
      expect(result.endGame).toBe(true)
      expect(result.updatedData?.score).toBe(2)
      expect((result.output as string[]).some(line => line.includes('Final score: 2/5'))).toBe(true)
    })

    it('trims whitespace from input', () => {
      const result = handleInput('  answer1  ', baseData)
      expect(result.updatedData?.score).toBe(1)
    })
  })
})
