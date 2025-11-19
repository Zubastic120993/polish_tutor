type Tone = 'success' | 'warning' | 'error'

interface StarRatingProps {
  score?: number
  tone: Tone
}

const toneClasses: Record<Tone, string> = {
  success: 'text-green-600',
  warning: 'text-amber-600',
  error: 'text-rose-600',
}

const MAX_STARS = 5

function Star({ type, toneClass }: { type: 'full' | 'half' | 'empty'; toneClass: string }) {
  return (
    <span className="relative inline-flex h-4 w-4">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300">
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {type !== 'empty' && (
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 h-4 w-4 ${toneClass} transition-opacity duration-300`}
          style={type === 'half' ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      )}
    </span>
  )
}

export function StarRating({ score = 0, tone }: StarRatingProps) {
  const rating = Math.max(0, Math.min(5, score * 5))
  const toneClass = toneClasses[tone]

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MAX_STARS }).map((_, idx) => {
        const starIndex = idx + 1
        let type: 'full' | 'half' | 'empty' = 'empty'
        if (rating >= starIndex) {
          type = 'full'
        } else if (rating >= starIndex - 0.5) {
          type = 'half'
        }
        return <Star key={starIndex} type={type} toneClass={toneClass} />
      })}
    </div>
  )
}
