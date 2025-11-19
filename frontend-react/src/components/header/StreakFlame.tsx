import { memo, useEffect, useRef, useState } from 'react'

interface Props {
  streak: number
  pulseKey: string | null
  isLoading: boolean
}

export const StreakFlame = memo(function StreakFlame({ streak, pulseKey, isLoading }: Props) {
  const [glow, setGlow] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!pulseKey) return
    setGlow(true)
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => setGlow(false), 1000)
  }, [pulseKey])

  if (isLoading) {
    return <div className="h-16 w-16 rounded-2xl shimmer" aria-label="Loading streak" />
  }

  const flameColor = streak > 0 ? 'text-orange-500' : 'text-slate-400'
  const wrapperClasses = [
    'flex flex-col items-center rounded-2xl border border-slate-100 bg-white/60 px-4 py-3 shadow-sm transition duration-300',
    glow ? 'scale-105 filter drop-shadow-flame' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-10 w-10 ${flameColor} transition duration-300 ease-out`}
        fill="currentColor"
        style={{
          filter: glow ? 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.6))' : undefined,
          transform: glow ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <path d="M12 2c1.5 2.1 2.5 4.4 3 6.6.5 2.4.4 4.8-.6 6.7 1.7-.4 3.2-1.8 4-3.5 0 4.2-2.5 8.2-6.4 9.4C8.1 20.4 6 16.5 6 13c0-2.1.7-3.6 1.5-5 .6 2.7 2.3 4.4 3.5 5.4-.5-3.1.7-6.8 1-11.4Z" />
      </svg>
      <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Streak</p>
      <p className="text-2xl font-semibold text-slate-900">{streak}</p>
    </div>
  )
})
