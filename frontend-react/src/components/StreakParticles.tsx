import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { FlameMode } from '../hooks/useFlameState'

interface Particle {
  id: string
  type: 'spark' | 'ember'
  size: number
  horizontal: number
  startOffsetY: number
  delay: number
  duration: number
  opacity: number
  driftX?: number
  ttl: number
  createdAt: number
}

interface StreakParticlesProps {
  mode: FlameMode
  trigger: number
  anchorRef: RefObject<HTMLElement | null>
  disabled?: boolean
}

const SPARK_TTL = 900
const EMBER_TTL = 3200
const EMBER_INTERVAL = 1500

export function StreakParticles({ mode, trigger, anchorRef, disabled = false }: StreakParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const emberIntervalRef = useRef<number | null>(null)
  const hasDocument = typeof document !== 'undefined'

  useEffect(() => {
    if (!hasDocument) return
    if (!anchorRef.current) return

    const updateRect = () => {
      if (!anchorRef.current) return
      setAnchorRect(anchorRef.current.getBoundingClientRect())
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [anchorRef, hasDocument])

  useEffect(() => {
    if (!hasDocument) return
    const cleanup = window.setInterval(() => {
      setParticles((prev) => {
        if (prev.length === 0) return prev
        const now = Date.now()
        return prev.filter((particle) => now - particle.createdAt < particle.ttl)
      })
    }, 250)
    return () => window.clearInterval(cleanup)
  }, [hasDocument])

  useEffect(() => {
    if (disabled) {
      setParticles([])
    }
  }, [disabled])

  useEffect(() => {
    if (!hasDocument || disabled || !anchorRect || mode !== 'boost' || trigger === 0) {
      return
    }
    const now = Date.now()
    const sparkCount = 5 + Math.floor(Math.random() * 4)
    const sparks: Particle[] = Array.from({ length: sparkCount }).map((_, index) => ({
      id: `spark-${trigger}-${index}-${now}-${Math.random().toString(16).slice(2, 6)}`,
      type: 'spark',
      size: 4 + Math.random() * 4,
      horizontal: (Math.random() - 0.5) * (anchorRect.width * 0.6),
      startOffsetY: Math.random() * 6,
      delay: Math.random() * 80,
      duration: 600,
      opacity: 0.65 + Math.random() * 0.25,
      ttl: SPARK_TTL,
      createdAt: now,
    }))
    setParticles((prev) => [...prev, ...sparks])
  }, [anchorRect, disabled, hasDocument, mode, trigger])

  useEffect(() => {
    if (!hasDocument || disabled || !anchorRect || mode !== 'perfect') {
      if (emberIntervalRef.current !== null) {
        window.clearInterval(emberIntervalRef.current)
        emberIntervalRef.current = null
      }
      return
    }

    const spawnEmbers = () => {
      const now = Date.now()
      const emberCount = 2 + Math.floor(Math.random() * 2)
      const embers: Particle[] = Array.from({ length: emberCount }).map((_, index) => ({
        id: `ember-${now}-${index}-${Math.random().toString(16).slice(2, 6)}`,
        type: 'ember',
        size: 6 + Math.random() * 4,
        horizontal: (Math.random() - 0.5) * (anchorRect.width * 0.4),
        startOffsetY: 16 + Math.random() * 10,
        delay: Math.random() * 200,
        duration: 3000,
        opacity: 0.35 + Math.random() * 0.25,
        driftX: (Math.random() - 0.5) * 30,
        ttl: EMBER_TTL,
        createdAt: now,
      }))
      setParticles((prev) => [...prev, ...embers])
    }

    spawnEmbers()
    emberIntervalRef.current = window.setInterval(spawnEmbers, EMBER_INTERVAL)
    return () => {
      if (emberIntervalRef.current !== null) {
        window.clearInterval(emberIntervalRef.current)
        emberIntervalRef.current = null
      }
    }
  }, [anchorRect, disabled, hasDocument, mode])

  const containerStyle: CSSProperties | null = useMemo(() => {
    if (!anchorRect) return null
    return {
      left: anchorRect.left + anchorRect.width / 2,
      top: anchorRect.top + anchorRect.height / 2,
      width: Math.max(80, anchorRect.width + 40),
      height: anchorRect.height + 140,
      transform: 'translate(-50%, -70%)',
      zIndex: 40,
    }
  }, [anchorRect])

  if (!hasDocument || disabled || !containerStyle || particles.length === 0) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none fixed" style={containerStyle} aria-hidden="true">
      <div className="relative h-full w-full">
        {particles.map((particle) => {
          const baseStyle: CSSProperties = {
            left: '50%',
            marginLeft: `${particle.horizontal}px`,
            bottom: `${particle.startOffsetY}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${particle.duration}ms`,
            opacity: particle.opacity,
          }

          if (particle.type === 'spark') {
            const sparkStyle: CSSProperties = {
              ...baseStyle,
              height: `${particle.size * 1.4}px`,
            }
            return (
              <span
                key={particle.id}
                className="absolute bottom-0 block rounded-full bg-gradient-to-t from-amber-400 via-orange-400 to-yellow-200 blur-[0.2px] drop-shadow-flame animate-spark-rise"
                style={sparkStyle}
              />
            )
          }

          const emberStyle: CSSProperties = {
            ...baseStyle,
            height: `${particle.size * 1.2}px`,
            ['--drift-x' as string]: `${particle.driftX ?? 0}px`,
          }

          return (
            <span
              key={particle.id}
              className="absolute bottom-4 block rounded-full bg-gradient-to-t from-orange-600/70 via-amber-400/70 to-yellow-200/70 drop-shadow-flame-perfect animate-ember-drift"
              style={emberStyle}
            />
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
