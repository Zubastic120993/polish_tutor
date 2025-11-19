import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { playMotivationSound } from '../../lib/motivationSounds'

interface LessonCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  xpEarned: number
  cefrLevel: string
  streak: number
}

const CONFETTI_COLORS = ['#fbbf24', '#34d399', '#93c5fd', '#f472b6']

export function LessonCompleteModal({ isOpen, onClose, xpEarned, cefrLevel, streak }: LessonCompleteModalProps) {
  const [isBrowser, setIsBrowser] = useState(false)
  const [allowAnimation, setAllowAnimation] = useState(true)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const autoCloseRef = useRef<number | null>(null)
  const confettiPieces = useMemo(() => {
    if (!isOpen || !allowAnimation) {
      return []
    }
    return Array.from({ length: 18 }).map((_, index) => ({
      id: `confetti-${index}`,
      left: `${Math.random() * 100}%`,
      delay: `${index * 60}ms`,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      drift: Math.random() > 0.5 ? 'confettiDriftLeft' : 'confettiDriftRight',
    }))
  }, [allowAnimation, isOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsBrowser(true)
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAllowAnimation(!query.matches)
    const listener = (event: MediaQueryListEvent) => {
      setAllowAnimation(!event.matches)
    }
    if (query.addEventListener) {
      query.addEventListener('change', listener)
    } else {
      query.addListener(listener)
    }
    return () => {
      if (query.removeEventListener) {
        query.removeEventListener('change', listener)
      } else {
        query.removeListener(listener)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    if (autoCloseRef.current) {
      window.clearTimeout(autoCloseRef.current)
    }
    autoCloseRef.current = window.setTimeout(() => {
      onClose()
    }, 5000)
    return () => {
      if (autoCloseRef.current) {
        window.clearTimeout(autoCloseRef.current)
      }
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    playMotivationSound('lessonComplete')
    closeButtonRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isBrowser || !isOpen) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-modal-fade-in">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white/95 p-8 text-center text-slate-900 shadow-2xl animate-modal-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Lesson complete celebration"
      >
        {allowAnimation && (
          <div className="pointer-events-none absolute inset-0">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="absolute h-2 w-1.5 rounded-full opacity-80 animate-confettiBurst"
                style={
                  {
                    left: piece.left,
                    backgroundColor: piece.color,
                    animationDelay: piece.delay,
                    ['--confetti-drift' as string]: `${piece.drift} 0.65s ease-out forwards`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="text-3xl font-semibold text-slate-900">🎉 Lesson Complete!</p>
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-200/70 bg-white/70 animate-modal-scale-in">
              <div className="absolute inset-0 rounded-full border border-blue-200 shadow-lg animate-cefr-ring-glow" />
              <div className="text-center">
                <p className="text-sm uppercase tracking-wide text-slate-400">CEFR</p>
                <p className="text-2xl font-bold text-slate-900">{cefrLevel}</p>
                <p className="text-xs text-slate-500">Glow unlocked</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xl font-semibold text-slate-800">
                <span className="text-amber-500 animate-xp-burst-pulse">+{Math.max(0, Math.round(xpEarned))} XP</span> earned!
              </p>
              {streak > 0 && (
                <div className="mt-2 flex items-center justify-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-orange-600">
                  <span className="text-2xl">🔥</span>
                  <span className="text-sm font-semibold">
                    {streak}-day streak
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="mt-4 rounded-full bg-slate-900 px-6 py-2 font-semibold text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
