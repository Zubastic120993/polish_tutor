import type { FormEvent } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CefrBadge } from '../components/CefrBadge'
import { ChatContainer } from '../components/ChatContainer'
import { HeaderStats } from '../components/HeaderStats'
import { KeyPhrasesCard } from '../components/KeyPhrasesCard'
import { ProgressIndicator } from '../components/controls/ProgressIndicator'
import { UserInputCard } from '../components/UserInputCard'

import { useEvaluation } from '../hooks/useEvaluation'
import { useLessonV2 } from '../hooks/useLessonV2'
import { useProgressSync } from '../hooks/useProgressSync'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioQueue } from '../state/useAudioQueue'

import { nextState, type LessonState } from '../state/lessonMachine'
import type { ChatMessage } from '../types/chat'

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
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
  const { xp, streak, cefrLevel, applyResult, xpFloatDelta, xpFloatKey, streakPulseKey } =
    useProgressSync()

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

  // Auto scroll
  useEffect(() => {
    if (!shouldScrollRef.current) return
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    })
    shouldScrollRef.current = false
  }, [messages])

  // Success sound
  const playSuccessSound = useCallback(() => {
    try {
      const audio = successAudioRef.current
      if (!audio) return
      audio.currentTime = 0
      audio.play().catch(() => undefined)
    } catch {}
  }, [])

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

    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        sender: 'user',
        text: trimmed,
        transcriptSource: source,
      },
    ])

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

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          sender: 'feedback',
          text: result.feedback,
          hint: result.hint,
          score: result.score,
          tone,
        },
      ])

      setState((prev) => nextState(prev, 'SHOW_FEEDBACK'))

      if (result.passed) {
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

  // Manual audio play handler (when user clicks play button)
  const handleManualAudioPlay = useCallback((audioUrl: string) => {
    // Mark that user has interacted
    hasUserInteracted.current = true
    playAudio(audioUrl)
  }, [playAudio])

  const canRespond = state === 'RECORDING'
  const controlsDisabled = !canRespond || isEvaluating || isAutoAdvancing

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="rounded-3xl border border-slate-100 bg-white/90 px-6 py-6 shadow-sm shadow-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Lesson</p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {manifest?.lessonId ?? lessonId}
              </h1>
              <p className="text-sm text-slate-500">Stay in the flow and earn XP.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CefrBadge level={cefrLevel} />
              <HeaderStats
                xp={xp}
                streak={streak}
                xpFloatDelta={xpFloatDelta}
                xpFloatKey={xpFloatKey}
                streakPulseKey={streakPulseKey}
              />
            </div>
          </div>

          <div className="mt-5">
            <ProgressIndicator
              current={Math.min(totalPhrases, phraseIndex + 1)}
              total={totalPhrases || 1}
            />
          </div>
        </header>

        {/* Main layout */}
        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.8fr,1fr]">
          
          {/* Chat section */}
          <section className="flex min-h-0 flex-col rounded-3xl border border-slate-100 bg-white/85 p-4 shadow-sm shadow-slate-200">
            <div className="flex-1 min-h-0">
              <ChatContainer
                messages={messages}
                onPlayAudio={handleManualAudioPlay}
                showTyping={typing}
                containerRef={chatContainerRef}
              />
            </div>

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
            />
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <KeyPhrasesCard
              phrases={manifest?.phrases ?? []}
              activePhraseId={currentPhrase?.id}
              onPlayPhrase={(phrase) => {
                hasUserInteracted.current = true
                playAudio(phrase.audioUrl)
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