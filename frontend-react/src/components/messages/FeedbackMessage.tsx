import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../types/chat'
import type { EvaluationErrorType, EvaluationRecommendation } from '../../types/evaluation'
import { ScoreBar } from '../ScoreBar'
import { StarRating } from '../StarRating'
import { MicroConfetti } from '../animation/MicroConfetti'
import { Shake } from '../animation/Shake'
import { AdaptiveHint } from './AdaptiveHint'

type Tone = 'success' | 'warning' | 'error'

export type FeedbackChatMessage = ChatMessage & {
  nextAction?: 'advance' | 'retry'
  error_type?: EvaluationErrorType
  recommendation?: EvaluationRecommendation
  focus_word?: string | null
}

interface Props {
  message: FeedbackChatMessage
}

const toneConfig: Record<
  Tone,
  {
    gradient: string
    icon: string
    iconColor: string
  }
> = {
  success: {
    gradient: 'from-emerald-50 to-emerald-100',
    icon: '✓',
    iconColor: 'text-emerald-600',
  },
  warning: {
    gradient: 'from-amber-50 to-amber-100',
    icon: '!',
    iconColor: 'text-amber-600',
  },
  error: {
    gradient: 'from-rose-50 to-rose-100',
    icon: '✕',
    iconColor: 'text-rose-600',
  },
}

export function FeedbackMessage({ message }: Props) {
  const tone: Tone = message.tone ?? 'warning'
  const toneStyles = toneConfig[tone]
  const isSuccess = tone === 'success'
  const shouldShake =
    !isSuccess && (((message.score ?? 0) < 0.6) || message.nextAction === 'retry')
  const showErrorFlash = tone === 'error'
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const [confettiKey, setConfettiKey] = useState(0)

  const updateOrigin = useCallback(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }, [])

  useLayoutEffect(() => {
    if (!cardRef.current) return
    
    // Scroll card into view first
    cardRef.current.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    })
    
    // Update origin after scroll completes
    const timer = setTimeout(() => {
      updateOrigin()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [updateOrigin, message.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', updateOrigin)
    return () => window.removeEventListener('resize', updateOrigin)
  }, [updateOrigin])

  useEffect(() => {
    if (!isSuccess) return
    
    // Delay confetti trigger to ensure card is visible
    const timer = setTimeout(() => {
      updateOrigin()
      setConfettiKey((key) => key + 1)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [isSuccess, message.id, updateOrigin])

  return (
    <div className="relative w-full">
      {isSuccess && confettiKey > 0 && origin && <MicroConfetti origin={origin} trigger={confettiKey} />}
      <Shake active={shouldShake}>
        <div
          ref={cardRef}
          className={`relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${toneStyles.gradient} p-4 shadow-sm shadow-slate-200 animate-cardIn`}
        >
          {isSuccess && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-emerald-200/70 animate-successGlow" />
          )}
          {showErrorFlash && (
            <span
              className="flash-highlight"
              style={{
                background: 'radial-gradient(circle, rgba(248,113,113,0.35), rgba(248,113,113,0))',
              }}
            />
          )}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl font-bold ${toneStyles.iconColor}`}
            >
              {toneStyles.icon}
            </div>
            <div className="flex flex-1 flex-col gap-2 text-sm text-slate-700">
              <p className="text-base font-semibold text-slate-900">{message.text}</p>
              {message.hint && <p className="text-sm text-slate-600">{message.hint}</p>}
            </div>
          </div>
          {message.error_type && (
            <AdaptiveHint
              type={message.error_type}
              recommendation={message.recommendation}
              focusWord={message.focus_word}
            />
          )}
          {typeof message.score === 'number' && (
            <div className="flex flex-col gap-2 rounded-xl bg-white/70 p-3">
              <StarRating score={message.score} tone={tone} />
              <ScoreBar score={message.score} tone={tone} />
            </div>
          )}
        </div>
      </Shake>
    </div>
  )
}