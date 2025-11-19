import { motion } from 'framer-motion'

interface Props {
  level: string
}

export function CefrBadge({ level }: Props) {
  return (
    <motion.div
      className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      CEFR · {level}
    </motion.div>
  )
}
