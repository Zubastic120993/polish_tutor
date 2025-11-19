import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFlameState } from '../hooks/useFlameState'
import { StreakParticles } from './StreakParticles'

interface StreakFlameProps {
  streak: number
  pulseKey: number
  isLoading: boolean
}

const flameAnimationMap = {
  idle: 'animate-flame-idle',
  boost: 'animate-flame-boost',
  perfect: 'animate-super-flicker',
  collapse: 'animate-flame-collapse',
  sleep: 'animate-flame-sleep',
} as const

export const StreakFlame = memo(function StreakFlame({ streak, pulseKey, isLoading }: StreakFlameProps) {
  const flameAnchorRef = useRef<HTMLDivElement>(null)
  const { flameMode, sparkTrigger, isPerfectStreak } = useFlameState(streak, pulseKey)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    handleChange()
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  const shouldAnimate = !prefersReducedMotion && !isLoading
  const flameAnimationClass = shouldAnimate ? flameAnimationMap[flameMode] : ''
  const glowAnimationClass = shouldAnimate && flameMode !== 'collapse' ? 'animate-glow-idle' : ''

  const wrapperClasses = useMemo(() => {
    const base =
      'relative flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm ring-1 ring-white/40 backdrop-blur'
    if (flameMode === 'collapse') {
      return `${base} border-rose-200/70 bg-white/80 animate-error-flash drop-shadow-flame-error`
    }
    if (flameMode === 'sleep') {
      return `${base} border-slate-100/60 bg-white/50 opacity-90`
    }
    if (isPerfectStreak) {
      return `${base} border-amber-200/80 bg-gradient-to-r from-white/80 to-amber-50/80 drop-shadow-flame-perfect`
    }
    return `${base} border-amber-100/80 bg-white/90 drop-shadow-flame`
  }, [flameMode, isPerfectStreak])

  const hasActiveStreak = streak > 0
  const numberColorClass = useMemo(() => {
    if (flameMode === 'collapse') {
      return 'text-rose-500 drop-shadow-flame-error'
    }
    if (!hasActiveStreak) {
      return 'text-slate-400'
    }
    if (isPerfectStreak) {
      return 'text-orange-500 drop-shadow-flame-perfect'
    }
    return 'text-amber-500 drop-shadow-flame'
  }, [flameMode, hasActiveStreak, isPerfectStreak])

  const numberStateClass = useMemo(() => {
    if (flameMode === 'sleep') {
      return shouldAnimate ? 'animate-streak-dim text-amber-300/80' : 'text-amber-300/80'
    }
    return ''
  }, [flameMode, shouldAnimate])

  const numberPulseClass = shouldAnimate && flameMode === 'boost' ? 'animate-streak-pulse' : ''
  const numberShakeClass = shouldAnimate && flameMode === 'collapse' ? 'animate-shake' : ''

  const ariaLabel = isLoading ? 'Loading streak' : `Current streak: ${streak} day${streak === 1 ? '' : 's'}`
  const flameGradient = isPerfectStreak
    ? 'from-orange-600 via-amber-400 to-yellow-200'
    : 'from-amber-500 via-orange-400 to-yellow-200'

  const streakNumber = isLoading ? '—' : streak

  return (
    <div className={wrapperClasses} aria-live="polite" aria-label={ariaLabel} role="status">
      <div className="relative flex h-16 w-14 items-end justify-center" ref={flameAnchorRef}>
        <div
          className={`absolute -inset-1 rounded-full blur-2xl ${glowAnimationClass} ${
            isPerfectStreak ? 'bg-orange-300/50' : 'bg-amber-300/40'
          }`}
        />
        <div
          className={`relative flex h-full w-12 items-end justify-center rounded-[45%_45%_55%_55%] bg-gradient-to-t ${flameGradient} ${
            shouldAnimate ? flameAnimationClass : ''
          } ${isPerfectStreak ? 'drop-shadow-flame-perfect' : 'drop-shadow-flame'} transition-all duration-300`}
        >
          <div className="absolute inset-x-3 bottom-2 h-2 rounded-full bg-white/70 blur-md opacity-70" />
          <div className="absolute inset-x-4 top-3 h-4 rounded-full bg-white/25 blur-[2px]" />
        </div>
      </div>

      <div className="flex flex-col text-xs uppercase tracking-[0.35em] text-slate-400">
        <span>Streak</span>
        <span
          className={`mt-1 text-3xl font-black leading-none tracking-tight ${numberColorClass} ${numberPulseClass} ${numberShakeClass} ${numberStateClass}`.trim()}
        >
          {streakNumber}
        </span>
      </div>

      <StreakParticles
        anchorRef={flameAnchorRef}
        mode={flameMode}
        trigger={sparkTrigger}
        disabled={!shouldAnimate || isLoading}
      />
    </div>
  )
})
