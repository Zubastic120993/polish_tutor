import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'

const COLORS = ['#A5B4FC', '#FDE68A', '#6EE7B7', '#FCA5A5']

interface Point {
  x: number
  y: number
}

interface Particle {
  id: string
  color: string
  size: number
  offsetX: number
  delay: number
  drift: 'left' | 'right'
}

interface MicroConfettiProps {
  origin: Point | null
  trigger: number
}

export function MicroConfetti({ origin, trigger }: MicroConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(false)

  const particleCount = useMemo(() => 14 + Math.floor(Math.random() * 9), [trigger])

  useEffect(() => {
    if (!origin || trigger === 0 || typeof window === 'undefined') {
      return
    }
    console.log('🎉 CONFETTI RENDERING', { 
      origin, 
      trigger, 
      particleCount
    })
    const generated: Particle[] = Array.from({ length: particleCount }).map((_, index) => ({
      id: `${trigger}-${index}`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 8 + Math.random() * 8, // Bigger particles for visibility
      offsetX: (Math.random() - 0.5) * 40, // Wider spread
      delay: Math.random() * 120,
      drift: Math.random() > 0.5 ? 'left' : 'right',
    }))
    setParticles(generated)
    setVisible(true)
    console.log('✨ Confetti particles generated:', generated.length)
    const timeout = window.setTimeout(() => {
      console.log('⏱️ Confetti timeout - hiding particles')
      setVisible(false)
    }, 2000) // Extended to 2 seconds for testing
    return () => window.clearTimeout(timeout)
  }, [origin, particleCount, trigger])

  if (!visible || !origin || typeof document === 'undefined') {
    return null
  }

  console.log('🎨 Rendering confetti portal with', particles.length, 'particles at x:', origin.x, 'y:', origin.y)

  return createPortal(
    <div
      className="pointer-events-none fixed"
      style={{
        left: origin.x,
        top: origin.y,
        transform: 'translate(-50%, -20px)',
        zIndex: 9999, // Explicit high z-index
      }}
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="confetti-particle"
          style={
            {
              backgroundColor: particle.color,
              width: particle.size,
              height: particle.size * 1.5,
              marginLeft: particle.offsetX,
              animationDelay: `${particle.delay}ms`,
              ['--confetti-drift' as string]: `${
                particle.drift === 'left' ? 'confettiDriftLeft' : 'confettiDriftRight'
              } 0.65s ease-out forwards`,
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  )
}