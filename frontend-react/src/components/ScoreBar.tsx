type Tone = 'success' | 'warning' | 'error'

interface ScoreBarProps {
  score: number
  tone: Tone
}

const toneBarClasses: Record<Tone, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
}

export function ScoreBar({ score, tone }: ScoreBarProps) {
  const value = Math.max(0, Math.min(1, score))
  const percent = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>Score</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/80">
        <div
          className={`h-full rounded-full ${toneBarClasses[tone]} transition-all duration-[400ms] ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
