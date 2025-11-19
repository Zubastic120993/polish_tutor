import { motion } from 'framer-motion'

interface StreakPulseProps {
  value: number
  trigger: number
}

export function StreakPulse({ value, trigger }: StreakPulseProps) {
  return (
    <motion.div
      key={`${trigger}-${value}`}
      initial={{ scale: 1, color: '#fb7185' }}
      animate={{ scale: [1, 1.2, 1], color: ['#fb7185', '#fdba74', '#fb7185'] }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex items-center gap-1 text-lg font-semibold text-rose-500"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 text-orange-500"
        fill="currentColor"
      >
        <path d="M12 2c1.5 2.1 2.5 4.4 3 6.6.5 2.4.4 4.8-.6 6.7 1.7-.4 3.2-1.8 4-3.5 0 4.2-2.5 8.2-6.4 9.4C8.1 20.4 6 16.5 6 13c0-2.1.7-3.6 1.5-5 .6 2.7 2.3 4.4 3.5 5.4-.5-3.1.7-6.8 1-11.4Z" />
      </svg>
      <span>{value}</span>
    </motion.div>
  )
}
