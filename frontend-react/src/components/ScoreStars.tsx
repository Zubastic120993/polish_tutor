import { motion } from 'framer-motion'

interface Props {
  score: number
}

const TOTAL_STARS = 5

export function ScoreStars({ score }: Props) {
  const activeStars = Math.round(score * TOTAL_STARS)

  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: TOTAL_STARS }).map((_, index) => (
        <motion.span
          key={index}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: index < activeStars ? 1 : 0.8,
            opacity: index < activeStars ? 1 : 0.4,
          }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 160 }}
        >
          ★
        </motion.span>
      ))}
    </div>
  )
}
