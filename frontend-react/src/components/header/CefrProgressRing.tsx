import { memo, useMemo } from 'react'

interface Props {
  level: string
  progress: number
  isLoading: boolean
}

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const CefrProgressRing = memo(function CefrProgressRing({ level, progress, isLoading }: Props) {
  const clampedProgress = useMemo(() => Math.min(Math.max(progress, 0), 1), [progress])
  const dashOffset = useMemo(() => CIRCUMFERENCE * (1 - clampedProgress), [clampedProgress])

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        {isLoading ? (
          <div
            className="absolute inset-0 rounded-full border-[6px] border-slate-200/70 animate-ringShimmer"
            aria-label="Loading CEFR progress"
          />
        ) : (
          <svg viewBox="0 0 72 72" className="h-16 w-16">
            <circle
              cx="36"
              cy="36"
              r={RADIUS}
              strokeWidth="6"
              className="fill-none stroke-slate-200"
            />
            <circle
              cx="36"
              cy="36"
              r={RADIUS}
              strokeWidth="6"
              className="fill-none stroke-indigo-500 transition-[stroke-dashoffset] duration-700 ease-out"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-900">{level}</span>
        </div>
      </div>
      <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">CEFR Progress</p>
    </div>
  )
})
