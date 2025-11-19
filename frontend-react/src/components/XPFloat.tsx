import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface XPFloatProps {
  value: number
  trigger: number
}

export function XPFloat({ value, trigger }: XPFloatProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!trigger || value <= 0) return
    setVisible(true)
    const timeout = window.setTimeout(() => setVisible(false), 800)
    return () => window.clearTimeout(timeout)
  }, [trigger, value])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={trigger}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -30 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-200 px-3 py-1 text-xs font-semibold text-amber-900 shadow-lg shadow-amber-200/80"
        >
          +{value} XP
        </motion.div>
      )}
    </AnimatePresence>
  )
}
