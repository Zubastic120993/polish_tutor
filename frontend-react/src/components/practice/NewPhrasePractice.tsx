import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { ProgressIndicator } from '../controls/ProgressIndicator'
import { TutorBubble } from '../TutorBubble'
import { FeedbackMessage, type FeedbackChatMessage } from '../messages/FeedbackMessage'
import { UserInputCard } from '../UserInputCard'
import { useEvaluation } from '../../hooks/useEvaluation'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { useAudioQueue } from '../../state/useAudioQueue'

import type { PracticeAttemptSummary, PracticeSummary, PhraseItem } from '../../types/practice'
import type { ChatMessage } from '../../types/chat'

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

interface NewPhrasePracticeProps {
  phrases: PhraseItem[]
  packId: string
  onComplete: (summary: PracticeSummary) => void
}

export function NewPhrasePractice({ phrases, packId, onComplete }: NewPhrasePracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [manualInput, setManualInput] = useState('')
  const [feedback, setFeedback] = useState<FeedbackChatMessage | null>(null)
  const [userResponse, setUserResponse] = useState<string>('')
  const [results, setResults] = useState<PracticeAttemptSummary[]>([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const { playAudio } = useAudioQueue()
  const evaluation = useEvaluation()
  const {
    startRecording,
    stopRecording,
    resetError,
    isRecording,
    isTranscribing,
    amplitude,
    elapsedSeconds,
    error: speechError,
  } = useSpeechRecognition()

  const autoAdvanceRef = useRef<number | null>(null)
  const completionRef = useRef(false)
  const feedbackRef = useRef<HTMLDivElement | null>(null)

  const total = phrases.length
  const currentPhrase = currentIndex < total ? phrases[currentIndex] : null

  useEffect(() => {
    setCurrentIndex(0)
    setManualInput('')
    setUserResponse('')
    setFeedback(null)
    setResults([])
    completionRef.current = false
  }, [packId])

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }, 150)
    }
  }, [feedback])

  useEffect(() => {
    if (total === 0) return
    if (currentIndex >= total && !completionRef.current) {
      completionRef.current = true
      const correct = results.filter((entry) => entry.passed).length
      onComplete({
        packId,
        total,
        correct,
        attempts: results,
      })
    }
  }, [currentIndex, total, results, onComplete, packId])

  const updateResults = useCallback((attempt: PracticeAttemptSummary) => {
    setResults((prev) => {
      const index = prev.findIndex((entry) => entry.phraseId === attempt.phraseId)
      if (index === -1) {
        return [...prev, attempt]
      }
      const next = [...prev]
      next[index] = attempt
      return next
    })
  }, [])

  const handleAdvance = useCallback(() => {
    setFeedback(null)
    setUserResponse('')
    setIsAutoAdvancing(false)
    setCurrentIndex((prev) => prev + 1)
  }, [])

  const handleEvaluation = useCallback(
    async (transcript: string, source: 'typed' | 'speech') => {
      if (!currentPhrase) return
      const trimmed = transcript.trim()
      if (!trimmed) return
      
      setUserResponse(trimmed)
      setIsEvaluating(true)

      try {
        // For new phrase practice: user should repeat what they see (currentPhrase.polish)
        const result = await evaluation.evaluate({
          phrase_id: currentPhrase.id,
          user_transcript: trimmed,
          audio_url: source === 'speech' ? '/local/microphone' : undefined,
          expected_phrase: currentPhrase.polish,
        })

        const tone: ChatMessage['tone'] =
          result.passed ? 'success' : result.score >= 0.6 ? 'warning' : 'error'

        setFeedback({
          id: createId(),
          sender: 'feedback',
          text: result.feedback,
          hint: result.hint,
          score: result.score,
          tone,
          nextAction: result.next_action,
          error_type: result.error_type ?? null,
          recommendation: result.recommendation,
          focus_word: result.focus_word ?? null,
        })

        updateResults({
          phraseId: currentPhrase.id,
          passed: result.passed,
          score: result.score,
        })

        if (result.passed) {
          setManualInput('')
          setIsAutoAdvancing(true)
          if (autoAdvanceRef.current) {
            window.clearTimeout(autoAdvanceRef.current)
          }
          autoAdvanceRef.current = window.setTimeout(() => {
            handleAdvance()
          }, 900)
        }
      } catch (err) {
        setFeedback({
          id: createId(),
          sender: 'feedback',
          text: err instanceof Error ? err.message : 'Evaluation failed.',
          tone: 'error',
        })
      } finally {
        setIsEvaluating(false)
      }
    },
    [currentPhrase, evaluation, handleAdvance, updateResults],
  )

  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!manualInput.trim() || isEvaluating || isAutoAdvancing) return
    handleEvaluation(manualInput, 'typed')
  }

  const handleMicToggle = async () => {
    if (isEvaluating || isAutoAdvancing) return

    if (isRecording) {
      const result = await stopRecording()
      if (result?.transcript) {
        handleEvaluation(result.transcript, 'speech')
      }
    } else {
      resetError()
      await startRecording()
    }
  }

  const tutorMessage: ChatMessage | null = currentPhrase
    ? {
        id: currentPhrase.id,
        sender: 'tutor',
        text: currentPhrase.polish,
        audioUrl: currentPhrase.audioUrl,
      }
    : null

  const canRespond = Boolean(currentPhrase) && !isEvaluating && !isAutoAdvancing

  if (!currentPhrase) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-10 text-center shadow-sm shadow-emerald-200">
        <p className="text-lg font-semibold text-emerald-800">
          All new phrases complete!
        </p>
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-col rounded-3xl border border-slate-100 bg-white/85 p-4 shadow-sm shadow-slate-200">
      <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <ProgressIndicator current={Math.min(total, currentIndex + 1)} total={total} />
      </div>

      <div className="flex-1 min-h-0">
        <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-6 shadow-inner shadow-slate-200">
          {tutorMessage && (
            <div>
              <TutorBubble
                message={tutorMessage}
                onReplay={() => {
                  if (tutorMessage.audioUrl) {
                    playAudio(tutorMessage.audioUrl)
                  }
                }}
              />
              {currentPhrase.english && (
                <p className="mt-2 text-sm italic text-slate-500">
                  {currentPhrase.english}
                </p>
              )}
            </div>
          )}

          {userResponse && (
            <div className="flex justify-end">
              <div className="relative max-w-[75%] rounded-2xl bg-green-100 px-4 py-2 text-right text-slate-900 shadow">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
                  You
                </div>
                <p className="text-base">{userResponse}</p>
              </div>
            </div>
          )}

          {feedback && (
            <div ref={feedbackRef} className="w-full">
              <FeedbackMessage message={feedback} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <UserInputCard
          manualInput={manualInput}
          onChange={setManualInput}
          onSubmit={handleManualSubmit}
          canRespond={canRespond}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onToggleMic={handleMicToggle}
          speechError={speechError}
          amplitude={amplitude}
          elapsedSeconds={elapsedSeconds}
          disabled={!canRespond}
        />
      </div>
    </section>
  )
}

