import { useEffect, useMemo, useState } from 'react'

interface DailyGoalIndicatorProps {
  currentXP: number
  targetXP: number
  onComplete?: () => void
}

interface StoredGoalState {
  date: string
  baselineXp: number
  completed: boolean
}

const STORAGE_KEY = 'daily_goal_indicator_state'

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function DailyGoalIndicator({ currentXP, targetXP, onComplete }: DailyGoalIndicatorProps) {
  const [state, setState] = useState<StoredGoalState>(() => {
    if (typeof window === 'undefined') {
      const today = new Date().toDateString()
      return { date: today, baselineXp: currentXP, completed: false }
    }
    try {
      const today = new Date().toDateString()
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return { date: today, baselineXp: currentXP, completed: false }
      }
      const parsed = JSON.parse(raw) as StoredGoalState
      if (parsed.date !== today) {
        return { date: today, baselineXp: currentXP, completed: false }
      }
      return parsed
    } catch (err) {
      console.warn('Unable to hydrate daily goal:', err)
      const today = new Date().toDateString()
      return { date: today, baselineXp: currentXP, completed: false }
    }
  })
  const [dayKey, setDayKey] = useState(() => new Date().toDateString())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const interval = window.setInterval(() => {
      const next = new Date().toDateString()
      setDayKey((prev) => (prev === next ? prev : next))
    }, 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (state.date !== dayKey) {
      setState({ date: dayKey, baselineXp: currentXP, completed: false })
    }
  }, [currentXP, dayKey, state.date])

  useEffect(() => {
    if (currentXP < state.baselineXp) {
      setState((prev) => ({ ...prev, baselineXp: currentXP, completed: false }))
    }
  }, [currentXP, state.baselineXp])

  const dailyXP = useMemo(() => {
    return Math.max(0, currentXP - state.baselineXp)
  }, [currentXP, state.baselineXp])

  const cappedProgress = Math.min(dailyXP, targetXP)
  const progressRatio = targetXP > 0 ? cappedProgress / targetXP : 0
  const strokeDashoffset = CIRCUMFERENCE - progressRatio * CIRCUMFERENCE
  const isComplete = dailyXP >= targetXP || state.completed

  useEffect(() => {
    if (isComplete && !state.completed) {
      setState((prev) => ({ ...prev, completed: true }))
      onComplete?.()
    }
  }, [isComplete, onComplete, state.completed])

  const tooltipLabel = `${Math.floor(cappedProgress)} / ${targetXP} XP today`
  const showFillAnimation = dailyXP > 0 && !isComplete

  return (
    <div className="relative" aria-label={`Daily goal progress: ${tooltipLabel}`}>
      <div className="group inline-flex items-center justify-center">
        <svg width="40" height="40" className="-rotate-90">
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            strokeWidth="3"
            stroke="currentColor"
            className="text-slate-200 opacity-60"
            fill="none"
          />
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            strokeWidth="3"
            fill="none"
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${
              isComplete
                ? 'text-emerald-400 animate-goal-complete-glow'
                : 'text-sky-500'
            } transition-[stroke-dashoffset] duration-500 ease-out ${showFillAnimation ? 'animate-goal-fill' : ''}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-semibold text-slate-600">
          {isComplete ? (
            <span className="text-lg text-emerald-500 animate-goal-checkmark">✓</span>
          ) : (
            <>
              <span>{Math.floor(cappedProgress)}</span>
              <span className="text-[9px] text-slate-400">/ {targetXP}</span>
            </>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {tooltipLabel}
        </div>
      </div>
    </div>
  )
}
