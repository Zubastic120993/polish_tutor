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
}

export function HeaderStats({ xp, streak, xpFloatDelta, xpFloatKey, streakPulseKey }: Props) {
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
      <XPFloat value={xpFloatDelta} trigger={xpFloatKey} />
      <motion.div initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">XP</span>
        <motion.span className="text-lg font-semibold text-amber-600" layout>
          {xpDisplay}
        </motion.span>
      </motion.div>
      <motion.div initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Streak</span>
        <StreakPulse value={streak} trigger={streakPulseKey} />
      </motion.div>
    </div>
  )
}
