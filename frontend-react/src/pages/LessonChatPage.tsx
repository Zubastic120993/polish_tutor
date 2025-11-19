import type { FormEvent } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'

import { KeyPhrasesCard } from '../components/KeyPhrasesCard'
import { ProgressIndicator } from '../components/controls/ProgressIndicator'
import { UserInputCard } from '../components/UserInputCard'
import { HeaderLayout } from '../components/header/HeaderLayout'
import { TutorBubble } from '../components/TutorBubble'
import { FeedbackMessage } from '../components/messages/FeedbackMessage'
import { TypingIndicator } from '../components/messages/TypingIndicator'

import { useEvaluation } from '../hooks/useEvaluation'
import { useLessonV2 } from '../hooks/useLessonV2'
import { useProgressSync } from '../hooks/useProgressSync'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioQueue } from '../state/useAudioQueue'

import { nextState, type LessonState } from '../state/lessonMachine'
import type { ChatMessage } from '../types/chat'
import type { EvaluationErrorType, EvaluationRecommendation } from '../types/evaluation'

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

type LessonChatMessage = ChatMessage & {
  nextAction?: 'advance' | 'retry'
  error_type?: EvaluationErrorType
  recommendation?: EvaluationRecommendation
  focus_word?: string | null
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export function LessonChatPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const lessonId = id ?? 'lesson_mock_001'

  // State
  const [state, setState] = useState<LessonState>('IDLE')
  const [messages, setMessages] = useState<LessonChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [summary, setSummary] = useState<LessonSummary>({
    total: 0,
    correct: 0,
    attempts: [],
  })

  const latestTutorId = useRef<string | null>(null)
  const hasUserInteracted = useRef(false)

  // Hooks
  const { playAudio } = useAudioQueue()
  const { manifest, currentPhrase, tutorTurn, lessonError, phraseIndex, loadNextPhrase } =
    useLessonV2(lessonId)

  const evaluation = useEvaluation()
  const {
    xp,
    streak,
    cefrLevel,
    applyResult,
    xpFloatDelta,
    xpFloatKey,
    streakPulseKey,
    isLoading: isProgressLoading,
    xpToNext,
    xpLevelProgress,
    cefrProgress,
  } = useProgressSync()

  const {
    startRecording,
    stopRecording,
    resetError: resetSpeechError,
    isRecording,
    isTranscribing,
    amplitude,
    elapsedSeconds,
    error: speechError,
  } = useSpeechRecognition()

  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const autoAdvanceTimeoutRef = useRef<number | null>(null)
  const successAudioRef = useRef<HTMLAudioElement | null>(null)
  const shouldScrollRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const lastUserMessageIdRef = useRef<string | null>(null)
  const userHighlightTimeoutRef = useRef<number | null>(null)
  const tutorHighlightTimeoutRef = useRef<number | null>(null)
  const micShakeTimeoutRef = useRef<number | null>(null)
  const fullRetryTimeoutRef = useRef<number | null>(null)
  const messagesRef = useRef<LessonChatMessage[]>([])

  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null)
  const [highlightedTutorId, setHighlightedTutorId] = useState<string | null>(null)
  const [retryMeta, setRetryMeta] = useState<{
    recommendation: EvaluationRecommendation
    focusWord: string | null
  }>({
    recommendation: 'proceed',
    focusWord: null,
  })
  const [micShake, setMicShake] = useState(false)
  const [fullRetryShake, setFullRetryShake] = useState(false)

  const totalPhrases = tutorTurn?.total ?? manifest?.phrases.length ?? 0

  // Reset refs when lesson restarts
  useEffect(() => {
    // Clear the tutor ID tracker when component mounts
    // This ensures audio plays on restart even with cached data
    latestTutorId.current = null
    hasUserInteracted.current = false
  }, [lessonId])

  // Summary update
  useEffect(() => {
    if (manifest?.phrases.length) {
      setSummary((prev) => ({ ...prev, total: manifest.phrases.length }))
    }
  }, [manifest])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // On complete
  useEffect(() => {
    if (state === 'COMPLETE') {
      navigate('/summary', { state: summary })
    }
  }, [state, summary, navigate])

  // Tutor messages
  useEffect(() => {
    if (!tutorTurn?.tutor_phrase) return

    const phraseId = currentPhrase?.id ?? `phrase-${tutorTurn.current_index}`
    const tutorMessageId = `tutor-${phraseId}-${tutorTurn.current_index}`

    if (latestTutorId.current === tutorMessageId) return
    latestTutorId.current = tutorMessageId

    setTyping(true)
    setState((prev) => nextState(prev, 'PROMPT_READY'))

    const timer = setTimeout(() => {
      const audioUrl = tutorTurn.audio_url ?? currentPhrase?.audioUrl
      
      setMessages((prev) => [
        ...prev,
        {
          id: tutorMessageId,
          sender: 'tutor',
          text: tutorTurn.tutor_phrase,
          audioUrl,
        },
      ])
      setTyping(false)
      setState((prev) => nextState(prev, 'ENABLE_RECORDING'))
      
      // Auto-play the tutor audio ONLY if user has already interacted
      // First phrase requires manual play
      if (audioUrl && hasUserInteracted.current) {
        playAudio(audioUrl, { auto: true })
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [tutorTurn, currentPhrase, playAudio])

  // Lesson error
  useEffect(() => {
    if (!lessonError) return
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        sender: 'feedback',
        text: 'Nie mogę załadować kolejnej frazy. Spróbuj ponownie za chwilę.',
        tone: 'error',
      },
    ])
  }, [lessonError])

  // Init success sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      successAudioRef.current = new Audio('/sfx/success.mp3')
    }
  }, [])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (userHighlightTimeoutRef.current) {
        window.clearTimeout(userHighlightTimeoutRef.current)
      }
      if (tutorHighlightTimeoutRef.current) {
        window.clearTimeout(tutorHighlightTimeoutRef.current)
      }
      if (micShakeTimeoutRef.current) {
        window.clearTimeout(micShakeTimeoutRef.current)
      }
      if (fullRetryTimeoutRef.current) {
        window.clearTimeout(fullRetryTimeoutRef.current)
      }
    }
  }, [])

  // Auto scroll
  useEffect(() => {
    if (!shouldScrollRef.current) return
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    })
    shouldScrollRef.current = false
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Success sound
  const playSuccessSound = useCallback(() => {
    try {
      const audio = successAudioRef.current
      if (!audio) return
      audio.currentTime = 0
      audio.play().catch(() => undefined)
    } catch {}
  }, [])

  const triggerUserHighlight = useCallback((messageId: string | null) => {
    if (!messageId) return
    setHighlightedUserId(messageId)
    if (userHighlightTimeoutRef.current) {
      window.clearTimeout(userHighlightTimeoutRef.current)
    }
    userHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedUserId(null)
    }, 320)
  }, [])

  const handleManualAudioPlay = useCallback(
    (audioUrl?: string) => {
      if (!audioUrl) return
      hasUserInteracted.current = true
      playAudio(audioUrl)
    },
    [playAudio],
  )

  const triggerTutorHighlight = useCallback((messageId: string | null) => {
    if (!messageId) return
    setHighlightedTutorId(messageId)
    if (tutorHighlightTimeoutRef.current) {
      window.clearTimeout(tutorHighlightTimeoutRef.current)
    }
    tutorHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedTutorId(null)
    }, 600)
  }, [])

  const triggerTutorAssist = useCallback(() => {
    const lastTutor = [...messagesRef.current].reverse().find((msg) => msg.sender === 'tutor')
    if (!lastTutor) return
    if (lastTutor.audioUrl) {
      handleManualAudioPlay(lastTutor.audioUrl)
    }
    if (typeof document !== 'undefined') {
      const node = document.getElementById(`message-${lastTutor.id}`)
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    triggerTutorHighlight(lastTutor.id)
  }, [handleManualAudioPlay, triggerTutorHighlight])

  const triggerMicShake = useCallback(() => {
    setMicShake(true)
    if (micShakeTimeoutRef.current) {
      window.clearTimeout(micShakeTimeoutRef.current)
    }
    micShakeTimeoutRef.current = window.setTimeout(() => {
      setMicShake(false)
    }, 500)
  }, [])

  const triggerFullRetryShake = useCallback(() => {
    setFullRetryShake(true)
    if (fullRetryTimeoutRef.current) {
      window.clearTimeout(fullRetryTimeoutRef.current)
    }
    fullRetryTimeoutRef.current = window.setTimeout(() => {
      setFullRetryShake(false)
    }, 600)
  }, [])

  const applyRecommendationEffects = useCallback(
    (recommendation: EvaluationRecommendation = 'proceed', focusWord?: string | null) => {
      setRetryMeta({ recommendation, focusWord: focusWord ?? null })
      if (recommendation === 'slow_down') {
        triggerMicShake()
      }
      if (recommendation === 'repeat_core') {
        triggerTutorAssist()
      }
      if (recommendation === 'full_retry') {
        triggerMicShake()
        triggerFullRetryShake()
      }
    },
    [triggerMicShake, triggerFullRetryShake, triggerTutorAssist],
  )

  // Handle advancing
  const handleAdvance = (action: 'advance' | 'retry') => {
    if (action === 'retry') {
      setState((prev) => nextState(prev, 'RETRY'))
      return
    }

    if (phraseIndex + 1 >= totalPhrases) {
      setState((prev) => nextState(prev, 'FINISH'))
      return
    }

    setState((prev) => nextState(prev, 'ADVANCE'))
    loadNextPhrase()
    shouldScrollRef.current = true
  }

  // Evaluation
  const handleEvaluation = async (transcript: string, source: 'typed' | 'speech') => {
    if (isEvaluating || isAutoAdvancing) return
    if (!currentPhrase) return

    const trimmed = transcript.trim()
    if (!trimmed) return

    // Mark that user has interacted
    hasUserInteracted.current = true

    setIsEvaluating(true)

    const userMessageId = createId()
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: trimmed,
        transcriptSource: source,
      },
    ])
    lastUserMessageIdRef.current = userMessageId

    const event = source === 'speech' ? 'TRANSCRIPT_READY' : 'REQUEST_EVAL'
    setState((prev) => nextState(prev, event))

    try {
      const result = await evaluation.evaluate({
        phrase_id: currentPhrase.id,
        user_transcript: trimmed,
        audio_url: source === 'speech' ? '/local/microphone' : undefined,
      })

      applyResult(result.score, result.passed)

      setSummary((prev) => ({
        total: totalPhrases || prev.total,
        correct: result.passed ? prev.correct + 1 : prev.correct,
        attempts: [
          ...prev.attempts,
          { phraseId: currentPhrase.id, score: result.score, passed: result.passed },
        ],
      }))

      const tone: ChatMessage['tone'] =
        result.passed ? 'success' : result.score >= 0.6 ? 'warning' : 'error'

      const feedbackId = createId()
      setMessages((prev) => [
        ...prev,
        {
          id: feedbackId,
          sender: 'feedback',
          text: result.feedback,
          hint: result.hint,
          score: result.score,
          tone,
          nextAction: result.next_action,
          error_type: result.error_type ?? null,
          recommendation: result.recommendation,
          focus_word: result.focus_word ?? null,
        },
      ])

      applyRecommendationEffects(result.recommendation ?? 'proceed', result.focus_word ?? null)
      setState((prev) => nextState(prev, 'SHOW_FEEDBACK'))

      if (result.passed) {
        triggerUserHighlight(lastUserMessageIdRef.current)
        playSuccessSound()
        setManualInput('')
        setIsAutoAdvancing(true)

        if (autoAdvanceTimeoutRef.current) {
          window.clearTimeout(autoAdvanceTimeoutRef.current)
        }

        autoAdvanceTimeoutRef.current = window.setTimeout(() => {
          setIsAutoAdvancing(false)
          handleAdvance(result.next_action)
        }, 900)
      } else {
        handleAdvance(result.next_action)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          sender: 'feedback',
          text: err instanceof Error ? err.message : 'Ewaluacja nie powiodła się.',
          tone: 'error',
        },
      ])
      setState((prev) => nextState(prev, 'RETRY'))
    } finally {
      setIsEvaluating(false)
    }
  }

  // Submit handler
  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!manualInput.trim() || isEvaluating || isAutoAdvancing) return
    handleEvaluation(manualInput, 'typed')
    setManualInput('')
  }

  // Mic handler
  const handleMicToggle = async () => {
    if (isEvaluating || isAutoAdvancing) return

    if (isRecording) {
      setState((prev) => nextState(prev, 'BEGIN_STT'))
      const result = await stopRecording()
      if (result?.transcript) {
        handleEvaluation(result.transcript, 'speech')
      } else {
        setState((prev) => nextState(prev, 'RETRY'))
      }
    } else {
      resetSpeechError()
      await startRecording()
    }
  }

  const canRespond = state === 'RECORDING'
  const controlsDisabled = !canRespond || isEvaluating || isAutoAdvancing
  const shouldShowFocusBanner = retryMeta.recommendation === 'repeat_focus_word'
  const shouldShowFullRetryCard = retryMeta.recommendation === 'full_retry'
  const micClassName = [
    retryMeta.recommendation === 'slow_down' ? 'animate-pulse' : '',
    micShake ? 'animate-shake' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        
        {/* Header */}
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
        <div className="mt-5 rounded-3xl border border-slate-100 bg-white px-6 py-4 shadow-sm shadow-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lesson</p>
            <p className="text-lg font-semibold text-slate-900">{manifest?.lessonId ?? lessonId}</p>
          </div>
          <div className="mt-3">
            <ProgressIndicator
              current={Math.min(totalPhrases, phraseIndex + 1)}
              total={totalPhrases || 1}
            />
          </div>
        </div>

        {/* Main layout */}
        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.8fr,1fr]">
          
          {/* Chat section */}
          <section className="flex min-h-0 flex-col rounded-3xl border border-slate-100 bg-white/85 p-4 shadow-sm shadow-slate-200">
            <div className="flex-1 min-h-0">
              <div
                ref={chatContainerRef}
                className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-6 shadow-inner shadow-slate-200"
              >
                <AnimatePresence initial={false}>
                  {messages.map((message) => {
                    const tutorHighlighted = highlightedTutorId === message.id
                    return (
                      <motion.div
                        key={message.id}
                        id={`message-${message.id}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                      >
                        {message.sender === 'tutor' && (
                          <div className="relative">
                            {tutorHighlighted && (
                              <span
                                className="flash-highlight"
                                style={{
                                  background:
                                    'radial-gradient(circle, rgba(59,130,246,0.25), rgba(59,130,246,0))',
                                }}
                              />
                            )}
                            <TutorBubble
                              message={message}
                              onReplay={() => handleManualAudioPlay(message.audioUrl)}
                            />
                          </div>
                        )}
                        {message.sender === 'user' && (
                          <div className="flex justify-end">
                            <div className="relative max-w-[75%] rounded-2xl bg-green-100 px-4 py-2 text-right text-slate-900 shadow">
                              {highlightedUserId === message.id && <span className="flash-highlight" />}
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
                                {message.transcriptSource === 'speech' ? 'Mic' : 'You'}
                              </div>
                              <p className="text-base">{message.text}</p>
                            </div>
                          </div>
                        )}
                        {message.sender === 'feedback' && <FeedbackMessage message={message} />}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {typing && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="space-y-3">
              {shouldShowFocusBanner && (
                <div className="shimmer rounded-2xl border border-amber-200/60 bg-amber-50/70 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm">
                  Powtórz słowo:{' '}
                  <span className="text-amber-900">
                    {retryMeta.focusWord ?? '...'}
                  </span>
                </div>
              )}
              {shouldShowFullRetryCard && (
                <div
                  className={`rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm ${
                    fullRetryShake ? 'animate-shake' : ''
                  }`}
                >
                  Spróbuj powtórzyć całe zdanie jeszcze raz.
                </div>
              )}
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
                disabled={controlsDisabled}
                micClassName={micClassName}
              />
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <KeyPhrasesCard
              phrases={manifest?.phrases ?? []}
              activePhraseId={currentPhrase?.id}
              onPlayPhrase={(phrase) => {
                handleManualAudioPlay(phrase.audioUrl)
              }}
            />

            <div className="rounded-3xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm shadow-slate-200">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">State</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{state}</p>
              <p className="mt-4 text-xs text-slate-400">
                Real-time evaluation powered by the Phase D backend.
              </p>
            </div>
          </aside>

        </main>
      </div>
    </div>
  )
}
