import { motion } from 'framer-motion'

interface Props {
  level: string
  isLoading?: boolean
}

export function CefrBadge({ level, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div
        className="h-8 w-28 animate-pulse rounded-full bg-slate-200/80"
        aria-label="Loading CEFR level"
      />
    )
  }

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
