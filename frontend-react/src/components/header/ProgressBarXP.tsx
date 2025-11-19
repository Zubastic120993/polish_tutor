import { memo, useEffect, useMemo, useState } from 'react'

interface Props {
  xp: number
  xpToNext: number
  progress: number
  deltaKey: number
  delta: number | null
  isLoading: boolean
}

export const ProgressBarXP = memo(function ProgressBarXP({
  xp,
  xpToNext,
  progress,
  deltaKey,
  delta,
  isLoading,
}: Props) {
  const [floatKey, setFloatKey] = useState(0)
  const [floatVisible, setFloatVisible] = useState(false)
  const [pulseActive, setPulseActive] = useState(false)

  const clampedProgress = useMemo(() => Math.min(Math.max(progress, 0), 1), [progress])
  const progressPercent = `${clampedProgress * 100}%`

  useEffect(() => {
    if (typeof delta !== 'number' || delta <= 0 || isLoading) {
      return
    }
    setFloatVisible(true)
    setFloatKey((key) => key + 1)
    const timeout = window.setTimeout(() => setFloatVisible(false), 1500)
    return () => window.clearTimeout(timeout)
  }, [deltaKey, delta, isLoading])

  useEffect(() => {
    if (typeof delta !== 'number' || delta <= 0 || isLoading) return
    setPulseActive(true)
    const timeout = window.setTimeout(() => setPulseActive(false), 800)
    return () => window.clearTimeout(timeout)
  }, [deltaKey, delta, isLoading])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Experience</p>
          <p className="text-lg font-semibold text-slate-900">{xp.toLocaleString()} XP</p>
        </div>
        <p className="text-xs font-medium text-slate-500">
          {xpToNext > 0 ? `${xpToNext.toLocaleString()} XP to next level` : 'Max level reached'}
        </p>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {isLoading ? (
          <div className="absolute inset-0 shimmer" aria-label="Loading XP progress" />
        ) : (
          <>
            <div
              className={`h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 transition-[width] duration-700 ease-out ${
                pulseActive ? 'animate-xpPulse' : ''
              }`}
              style={{ width: progressPercent }}
            />
            {floatVisible && delta && (
              <div
                key={floatKey}
                className="pointer-events-none absolute -top-7 flex -translate-x-1/2 animate-xpFloat items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-amber-600 shadow-sm shadow-amber-100"
                style={{ left: progressPercent }}
              >
                +{delta} XP
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})
