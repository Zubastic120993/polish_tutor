import { ScoreBar } from './ScoreBar'
import { StarRating } from './StarRating'

type Tone = 'success' | 'warning' | 'error'

interface FeedbackCardProps {
  text: string
  hint?: string
  score?: number
  tone: Tone
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
    gradient: 'from-green-50 to-green-100',
    icon: '✓',
    iconColor: 'text-green-600',
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

export function FeedbackCard({ text, hint, score, tone }: FeedbackCardProps) {
  const toneStyles = toneConfig[tone]
  return (
    <div
      className={`flex w-full flex-col gap-4 rounded-xl bg-gradient-to-br ${toneStyles.gradient} p-4 shadow-sm shadow-slate-200 transition-transform animate-fadeIn sm:flex-row`}
    >
      <div className="flex w-full flex-1 items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl font-bold ${toneStyles.iconColor}`}>
          {toneStyles.icon}
        </div>
        <div className="flex flex-1 flex-col gap-2 text-sm text-slate-700">
          <p className="text-base font-semibold text-slate-900">{text}</p>
          {hint && <p className="text-sm text-slate-600">{hint}</p>}
          {typeof score === 'number' && (
            <div className="flex flex-col gap-2">
              <StarRating score={score} tone={tone} />
              <ScoreBar score={score} tone={tone} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
