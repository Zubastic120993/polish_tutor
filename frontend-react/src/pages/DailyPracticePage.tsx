import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HeaderLayout } from '../components/header/HeaderLayout'
import { PracticeRouter } from '../components/practice/PracticeRouter'
import { NewPhrasePractice } from '../components/practice/NewPhrasePractice'
import { ProgressIndicator } from '../components/controls/ProgressIndicator'
import { TutorBubble } from '../components/TutorBubble'
import { FeedbackMessage, type FeedbackChatMessage } from '../components/messages/FeedbackMessage'
import { UserInputCard } from '../components/UserInputCard'
import { useDailyPractice } from '../hooks/useDailyPractice'
import { useProgressSync } from '../hooks/useProgressSync'
import { useEvaluation } from '../hooks/useEvaluation'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioQueue } from '../state/useAudioQueue'

import type { PracticeAttemptSummary, PracticeSummary, PracticeType, PhraseItem } from '../types/practice'
import type { ChatMessage } from '../types/chat'

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

const PRACTICE_TABS: Array<{ type: PracticeType; label: string }> = [
  { type: 'review', label: 'Review' },
  { type: 'new', label: 'New Phrases' },
  { type: 'dialog', label: 'Dialog' },
  { type: 'pronunciation', label: 'Pronunciation' },
]

export function DailyPracticePage() {
  const navigate = useNavigate()
  const { practicePack, isLoading, isFetching, error, refetch } = useDailyPractice()
  const [currentType, setCurrentType] = useState<PracticeType>('review')

  const {
    xp,
    streak,
    cefrLevel,
    xpFloatDelta,
    xpFloatKey,
    streakPulseKey,
    isLoading: isProgressLoading,
    xpToNext,
    xpLevelProgress,
    cefrProgress,
  } = useProgressSync()

  const [reviewSummary, setReviewSummary] = useState<PracticeSummary | null>(null)

  const handleReviewComplete = useCallback(
    (summary: PracticeSummary) => {
      setReviewSummary(summary)
      const hasNewPhrases = (practicePack?.newPhrases?.length ?? 0) > 0
      if (hasNewPhrases) {
        // Transition to new phrases
        setCurrentType('new')
      } else {
        // No new phrases, go straight to summary
      navigate('/practice-summary', { state: summary })
      }
    },
    [navigate, practicePack],
  )

  const handleNewComplete = useCallback(
    (newSummary: PracticeSummary) => {
      // Merge review and new summaries
      const combinedSummary: PracticeSummary = {
        packId: practicePack?.packId ?? 'daily_pack',
        total: (reviewSummary?.total ?? 0) + newSummary.total,
        correct: (reviewSummary?.correct ?? 0) + newSummary.correct,
        attempts: [...(reviewSummary?.attempts ?? []), ...newSummary.attempts],
      }
      navigate('/practice-summary', { state: combinedSummary })
    },
    [navigate, practicePack, reviewSummary],
  )

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  const hasReviewItems = (practicePack?.reviewPhrases.length ?? 0) > 0
  const hasNewItems = (practicePack?.newPhrases?.length ?? 0) > 0

  useEffect(() => {
    if (!hasReviewItems) {
      setCurrentType('review')
    }
  }, [hasReviewItems])

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-8 text-center shadow-sm shadow-slate-200">
          <p className="text-base font-semibold text-slate-600">Loading practice pack…</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-8 text-center shadow-sm shadow-rose-200">
          <p className="text-base font-semibold text-rose-700">Unable to load practice pack.</p>
          <p className="mt-2 text-sm text-rose-600">{error.message}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500"
          >
            Try again
          </button>
        </div>
      )
    }

    if (!practicePack || (!hasReviewItems && !hasNewItems)) {
      return (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-8 text-center shadow-sm shadow-emerald-200">
          <p className="text-lg font-semibold text-emerald-800">Nothing to practice right now.</p>
          <p className="mt-2 text-sm text-emerald-700">
            Come back later for a fresh Daily Practice pack.
          </p>
        </div>
      )
    }

    return (
      <PracticeRouter
        type={currentType}
        review={
          hasReviewItems ? (
          <ReviewPractice
            phrases={practicePack.reviewPhrases}
            packId={practicePack.packId}
            onComplete={handleReviewComplete}
          />
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-center text-slate-500 shadow-sm shadow-slate-200">
              No review items available.
            </div>
          )
        }
        new={
          hasNewItems ? (
            <NewPhrasePractice
              phrases={practicePack.newPhrases!}
              packId={practicePack.packId}
              onComplete={handleNewComplete}
            />
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-center text-slate-500 shadow-sm shadow-slate-200">
              No new phrases available.
            </div>
          )
        }
        dialog={<ComingSoon label="Dialog practice coming soon." />}
        pronunciation={<ComingSoon label="Pronunciation drills coming soon." />}
      />
    )
  }, [currentType, error, handleReviewComplete, handleNewComplete, handleRetry, hasReviewItems, hasNewItems, isLoading, practicePack])

  const reviewCount = practicePack?.reviewPhrases.length ?? 0
  const newCount = practicePack?.newPhrases?.length ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <HeaderLayout
          xp={xp}
          xpToNext={xpToNext}
          xpLevelProgress={xpLevelProgress}
          xpFloatDelta={xpFloatDelta}
          xpFloatKey={xpFloatKey}
          streak={streak}
          streakPulseKey={streakPulseKey}
          cefrLevel={cefrLevel}
          cefrProgress={cefrProgress}
          isLoading={isProgressLoading}
        />

        <section className="mt-5 rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm shadow-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Daily Pack
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {practicePack?.packId ?? 'daily_pack'}
              </p>
            </div>
            <div className="flex gap-2">
              {reviewCount > 0 && (
              <span className="rounded-full bg-blue-50 px-4 py-1 text-sm font-semibold text-blue-700">
                  {reviewCount} review
                </span>
              )}
              {newCount > 0 && (
                <span className="rounded-full bg-purple-50 px-4 py-1 text-sm font-semibold text-purple-700">
                  {newCount} new
              </span>
              )}
              <button
                type="button"
                onClick={handleRetry}
                disabled={isFetching}
                className="rounded-full border border-slate-200 px-4 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRACTICE_TABS.map((tab) => {
              let disabled = true
              if (tab.type === 'review') {
                disabled = !hasReviewItems
              } else if (tab.type === 'new') {
                disabled = !hasNewItems
              }
              // dialog and pronunciation remain disabled for now
              
              return (
                <button
                  key={tab.type}
                  type="button"
                  disabled={disabled}
                  onClick={() => setCurrentType(tab.type)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    currentType === tab.type
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </section>

        <main className="mt-6 flex-1">{content}</main>
      </div>
    </div>
  )
}

interface ReviewPracticeProps {
  phrases: PhraseItem[]
  packId: string
  onComplete: (summary: PracticeSummary) => void
}

function ReviewPractice({ phrases, packId, onComplete }: ReviewPracticeProps) {
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
        // For repetition practice: user should repeat what they see (currentPhrase.polish)
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
          All review phrases complete!
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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-center text-slate-500 shadow-sm shadow-slate-200">
      {label}
    </div>
  )
}
