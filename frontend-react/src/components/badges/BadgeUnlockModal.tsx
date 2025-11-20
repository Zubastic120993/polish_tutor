import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import type { BadgeBase } from '../../types/badges'

interface BadgeUnlockModalProps {
  badges: BadgeBase[]
  onComplete: () => void
}

export function BadgeUnlockModal({ badges, onComplete }: BadgeUnlockModalProps) {
  const [index, setIndex] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  const badge = badges[index]

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Trigger confetti when badge changes
  useEffect(() => {
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 4000) // Stop after 4 seconds
    return () => clearTimeout(timer)
  }, [index])

  const handleContinue = () => {
    if (index < badges.length - 1) {
      setIndex(i => i + 1)
    } else {
      onComplete()
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const modalRoot = document.getElementById('modal-root')
  if (!modalRoot) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={(e) => {
          // Prevent closing by clicking backdrop
          e.stopPropagation()
        }}
      >
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.3}
          />
        )}

        {/* Badge Card */}
        <motion.div
          key={index} // Re-animate on badge change
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
          className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Badge Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.2,
              type: 'spring',
              stiffness: 500,
              damping: 15
            }}
            className="mx-auto mb-4"
          >
            <span className="text-6xl">
              {badge.icon || '🏆'}
            </span>
          </motion.div>

          {/* Unlocked Badge */}
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600"
          >
            Unlocked!
          </motion.p>

          {/* Badge Name */}
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-2xl font-bold text-slate-900"
          >
            {badge.name}
          </motion.h2>

          {/* Badge Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-sm text-slate-600"
          >
            {badge.description}
          </motion.p>

          {/* Progress Indicator */}
          {badges.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex justify-center gap-2"
            >
              {badges.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === index ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                />
              ))}
            </motion.div>
          )}

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            type="button"
            onClick={handleContinue}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
          >
            {index < badges.length - 1 ? 'Continue' : 'Awesome!'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    modalRoot
  )
}

