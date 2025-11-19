import { motion, useMotionValueEvent, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { XPFloat } from './XPFloat'
import { StreakPulse } from './StreakPulse'

interface Props {
  xp: number
  streak: number
  xpFloatDelta: number
  xpFloatKey: number
  streakPulseKey: number
  isLoading?: boolean
}

export function HeaderStats({
  xp,
  streak,
  xpFloatDelta,
  xpFloatKey,
  streakPulseKey,
  isLoading = false,
}: Props) {
  const xpSpring = useSpring(xp, { stiffness: 120, damping: 20 })
  const [xpDisplay, setXpDisplay] = useState(xp)

  useEffect(() => {
    xpSpring.set(xp)
  }, [xp, xpSpring])

  useMotionValueEvent(xpSpring, 'change', (latest) => {
    setXpDisplay(Math.round(latest))
  })

  return (
    <div className="relative flex items-center gap-4 rounded-2xl bg-white px-4 py-2 shadow">
      {!isLoading && <XPFloat value={xpFloatDelta} trigger={xpFloatKey} />}
      <motion.div initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">XP</span>
        <motion.span
          className={`text-lg font-semibold ${isLoading ? 'animate-pulse text-slate-400' : 'text-amber-600'}`}
          layout
        >
          {isLoading ? '...' : xpDisplay}
        </motion.span>
      </motion.div>
      <motion.div initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Streak</span>
        {isLoading ? (
          <div className="flex items-center gap-1 text-lg font-semibold text-slate-400 animate-pulse">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
              <path d="M12 2c1.5 2.1 2.5 4.4 3 6.6.5 2.4.4 4.8-.6 6.7 1.7-.4 3.2-1.8 4-3.5 0 4.2-2.5 8.2-6.4 9.4C8.1 20.4 6 16.5 6 13c0-2.1.7-3.6 1.5-5 .6 2.7 2.3 4.4 3.5 5.4-.5-3.1.7-6.8 1-11.4Z" />
            </svg>
            <span>...</span>
          </div>
        ) : (
          <StreakPulse value={streak} trigger={streakPulseKey} />
        )}
      </motion.div>
    </div>
  )
}
