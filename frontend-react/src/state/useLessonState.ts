import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMockLesson } from '../lib/mockLessonProvider'
import { evaluateMock } from '../lib/mockEvaluator'
import type { ChatMessage } from '../types/chat'
import type { LessonData, LessonPhrase } from '../types/lesson'
import { nextState, type LessonState } from './lessonMachine'

interface SummaryEntry {
  phraseId: string
  passed: boolean
  score: number
}

interface LessonSummary {
  total: number
  correct: number
  attempts: SummaryEntry[]
}

interface UseLessonState {
  state: LessonState
  currentPhrase: LessonPhrase | null
  phraseIndex: number
  messages: ChatMessage[]
  typing: boolean
  sendUserMessage: (text: string) => void
  nextPhrase: () => void
  summary: LessonSummary
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export function useLessonState(): UseLessonState {
  const lesson: LessonData = useMemo(() => getMockLesson(), [])
  const [state, setState] = useState<LessonState>('TUTOR_SPEAKING')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const evaluationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [summary, setSummary] = useState<LessonSummary>({
    total: lesson.phrases.length,
    correct: 0,
    attempts: [],
  })

  const currentPhrase = lesson.phrases[phraseIndex] ?? null

  useEffect(() => {
    if (state !== 'TUTOR_SPEAKING' || !currentPhrase) return
    setTyping(true)
    const timeout = setTimeout(() => {
      setTyping(false)
      setMessages((prev) => {
        const alreadyRendered = prev.some((msg) => msg.id === currentPhrase.id)
        if (alreadyRendered) return prev
        const tutorMessage: ChatMessage = {
          id: currentPhrase.id,
          sender: 'tutor',
          text: currentPhrase.pl,
          audioUrl: currentPhrase.audioUrl,
        }
        return [...prev, tutorMessage]
      })
      setState((prev) => nextState(prev, 'AWAIT_USER'))
    }, 600)
    return () => clearTimeout(timeout)
  }, [state, currentPhrase])

  const clearTimers = useCallback(() => {
    if (recordingTimeout.current) {
      clearTimeout(recordingTimeout.current)
      recordingTimeout.current = null
    }
    if (evaluationTimeout.current) {
      clearTimeout(evaluationTimeout.current)
      evaluationTimeout.current = null
    }
  }, [])

  const goToNextPhrase = useCallback(() => {
    setMessages((prev) => prev)
    setPhraseIndex((prevIndex) => {
      const nextIndex = prevIndex + 1
      if (nextIndex >= lesson.phrases.length) {
        setState('FINISHED')
        return prevIndex
      }
      setState('TUTOR_SPEAKING')
      return nextIndex
    })
  }, [lesson.phrases.length])

  const sendUserMessage = useCallback(
    (text: string) => {
      if (!currentPhrase || !text.trim()) return
      if (state !== 'WAITING_FOR_USER') return
      clearTimers()
      setState('RECORDING')
      const trimmed = text.trim()
      const userMessage: ChatMessage = {
        id: createId(),
        sender: 'user',
        text: trimmed,
      }
      setMessages((prev) => [...prev, userMessage])

      recordingTimeout.current = setTimeout(() => {
        setState('EVALUATING')
        const result = evaluateMock(trimmed)
        const feedbackMessage: ChatMessage = {
          id: createId(),
          sender: 'feedback',
          text: result.feedback,
          score: result.score,
        }
        setMessages((prev) => [...prev, feedbackMessage])
        setSummary((prev) => ({
          total: prev.total,
          correct: result.passed ? prev.correct + 1 : prev.correct,
          attempts: [
            ...prev.attempts,
            { phraseId: currentPhrase.id, passed: result.passed, score: result.score },
          ],
        }))
        setState('FEEDBACK')
        evaluationTimeout.current = setTimeout(() => {
          setState('NEXT_PHRASE')
          goToNextPhrase()
        }, 1000)
      }, 700)
    },
    [currentPhrase, state, goToNextPhrase],
  )

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    state,
    currentPhrase,
    phraseIndex,
    messages,
    typing,
    sendUserMessage,
    nextPhrase: goToNextPhrase,
    summary,
  }
}
