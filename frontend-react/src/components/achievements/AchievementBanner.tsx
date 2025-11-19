import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import type { Achievement } from '../../hooks/useAchievementQueue'
import { playMotivationSound } from '../../lib/motivationSounds'

interface AchievementBannerProps {
  achievement: Achievement | null
  onComplete: () => void
}

const COLOR_MAP: Record<Achievement['color'], { gradient: string; accent: string }> = {
  orange: {
    gradient: 'from-amber-500 via-orange-500 to-amber-400',
    accent: 'text-amber-100',
  },
  green: {
    gradient: 'from-emerald-500 via-green-500 to-emerald-400',
    accent: 'text-emerald-100',
  },
  blue: {
    gradient: 'from-blue-500 via-indigo-500 to-sky-400',
    accent: 'text-sky-100',
  },
  yellow: {
    gradient: 'from-yellow-400 via-amber-400 to-amber-300',
    accent: 'text-yellow-900',
  },
  red: {
    gradient: 'from-red-500 via-orange-500 to-rose-400',
    accent: 'text-rose-100',
  },
}

export function AchievementBanner({ achievement, onComplete }: AchievementBannerProps) {
  const [isBrowser, setIsBrowser] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [allowSparkles, setAllowSparkles] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsBrowser(true)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAllowSparkles(!mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setAllowSparkles(!event.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  useEffect(() => {
    if (!achievement) return
    setIsVisible(true)

    const duration = achievement.duration ?? 1800
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false)
    }, duration)

    const completeTimer = window.setTimeout(() => {
      onComplete()
    }, duration + 450)

    if (achievement.soundEffect) {
      playMotivationSound(achievement.soundEffect)
    } else {
      playMotivationSound('achievementBanner')
    }

    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(completeTimer)
    }
  }, [achievement, onComplete])

  const sparkles = useMemo(() => {
    if (!achievement) {
      return []
    }
    return Array.from({ length: 5 }).map((_, index) => ({
      id: `${achievement.id}-sparkle-${index}`,
      delay: `${index * 80}ms`,
      left: `${15 + index * 12}%`,
      top: `${10 + (index % 3) * 20}%`,
    }))
  }, [achievement])

  if (!achievement || !isBrowser) {
    return null
  }

  const colorConfig = COLOR_MAP[achievement.color]

  return createPortal(
    <>
      <div
        className={`pointer-events-none fixed inset-0 z-[55] bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-4">
        <div
          className={`relative flex items-center gap-4 rounded-2xl px-8 py-4 text-white shadow-2xl shadow-slate-900/30 ${
            isVisible ? 'animate-banner-slide-in' : 'animate-banner-slide-out'
          } bg-gradient-to-r ${colorConfig.gradient}`}
          role="status"
          aria-live="polite"
        >
          <div className={`text-3xl font-semibold ${colorConfig.accent}`}>{achievement.title.split(' ')[0]}</div>
          <div>
            <p className="text-lg font-bold leading-tight">{achievement.title}</p>
            <p className="text-sm font-medium text-white/90">{achievement.message}</p>
          </div>
          {allowSparkles && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {sparkles.map((sparkle) => (
                <span
                  key={sparkle.id}
                  className="absolute h-1.5 w-1.5 rounded-full bg-white/90 animate-banner-sparkle"
                  style={{
                    left: sparkle.left,
                    top: sparkle.top,
                    animationDelay: sparkle.delay,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
