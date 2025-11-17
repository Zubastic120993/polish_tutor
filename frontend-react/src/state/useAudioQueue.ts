import { useCallback, useRef } from 'react'

export function useAudioQueue() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)

  const playTone = useCallback(() => {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return
    if (!contextRef.current) {
      contextRef.current = new AudioContext()
    }
    const ctx = contextRef.current
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 540
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    oscillator.stop(ctx.currentTime + 0.4)
  }, [])

  const playAudio = useCallback(
    (audioUrl?: string) => {
      if (!audioUrl) {
        playTone()
        return
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play().catch(() => {
        playTone()
      })
    },
    [playTone],
  )

  return { playAudio }
}
