import { motion } from "framer-motion"

import { getXpRange, getXpProgress, getXpToNextLevel } from "../../utils/xp"

interface XpHeroCardProps {
  totalXp: number
  level: number
  streak: number
}

export function XpHeroCard({ totalXp, level, streak }: XpHeroCardProps) {
  const [xpMin, xpMax] = getXpRange(totalXp)
  const progress = getXpProgress(totalXp)
  const xpToNext = getXpToNextLevel(totalXp)

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-3xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]
                 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 max-w-4xl mx-auto cursor-pointer
                 transition-all duration-300 ease-out
                 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]
                 active:scale-[0.98] focus-within:ring-2 focus-within:ring-amber-400
                 touch-target"
    >
      {/* Subtle outer ring */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/60" />
      
      {/* Amber/gold top glow gradient - consistent pattern */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-50/50 via-amber-50/25 to-transparent opacity-[0.32] sm:opacity-[0.5]" />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Your Progress</h2>
          <p className="text-slate-600">Keep practicing to level up! 💪</p>
        </div>

        {/* Level Badge */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white
                     px-5 py-3 text-3xl font-extrabold shadow"
        >
          {level}
        </motion.div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-3 flex items-center justify-between relative z-10">
        <p className="text-slate-700 font-medium">XP Progress</p>
        <p className="text-slate-500 text-sm">
          {totalXp - xpMin} / {xpMax - xpMin} XP
        </p>
      </div>

      <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
        />
      </div>

      {/* XP to next level */}
      <p className="mt-3 text-slate-600 text-sm relative z-10 flex items-center gap-2">
        {xpToNext === 0 ? (
          "🎉 You reached the max level!"
        ) : (
          <>
            <motion.span
              className="text-4xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              ⚡
            </motion.span>
            Only {xpToNext} XP to next level!
          </>
        )}
      </p>

      {/* Streak Block */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 p-4 flex items-center justify-between relative z-10"
      >
        <div>
          <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">
            Current Streak
          </p>
          <p className="text-2xl font-bold text-red-700">{streak} days 🔥</p>
        </div>
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="text-5xl"
        >
          🔥
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

