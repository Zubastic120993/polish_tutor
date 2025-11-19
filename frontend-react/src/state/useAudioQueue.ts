import { useCallback, useEffect, useRef } from 'react'

const BACKEND_ORIGIN = 'http://localhost:8000'
const AUDIO_CACHE_PREFIX = '/audio_cache_v2'

const buildAudioUrl = (url?: string | null) => {
  if (!url) {
    console.warn('[audio] no audio url provided')
    return null
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  if (url.startsWith(AUDIO_CACHE_PREFIX)) {
    return `${BACKEND_ORIGIN}${url}`
  }

  const sanitized = url.replace(/^\/+/, '')
  return `${BACKEND_ORIGIN}${AUDIO_CACHE_PREFIX}/${sanitized}`
}

// Survives unmount/mount in the same session (helps with StrictMode)
const autoPlayedOnce = new Set<string>()
let isStrictModeSecondMount = false

type PlayOptions = {
  /** For auto-plays (lesson steps); duplicates of same URL are skipped. */
  auto?: boolean
}

export function useAudioQueue() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const ensureAudioElement = () => {
    if (audioRef.current) {
      return audioRef.current
    }

    if (typeof window === 'undefined') {
      return null
    }

    const element = document.createElement('audio')
    element.preload = 'auto'
    audioRef.current = element
    return element
  }

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current && typeof URL !== 'undefined') {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const hydrateSource = useCallback(
    async (url: string) => {
      if (typeof window === 'undefined' || typeof URL === 'undefined') {
        return url
      }

      try {
        const response = await fetch(url, { mode: 'cors' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()
        releaseObjectUrl()
        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        return objectUrl
      } catch (error) {
        throw error
      }
    },
    [releaseObjectUrl],
  )

  const playAudio = useCallback(
    async (audioUrl?: string | null, options: PlayOptions = {}) => {
      const resolvedUrl = buildAudioUrl(audioUrl)
      if (!resolvedUrl) {
        return
      }

      const player = ensureAudioElement()
      if (!player) {
        console.warn('[audio] audio element unavailable')
        return
      }

      const { auto = false } = options

      if (auto && autoPlayedOnce.has(resolvedUrl)) {
        console.log('[audio] skipping auto play, already played:', resolvedUrl)
        return
      }

      console.log('[audio] attempting to play:', resolvedUrl)
      player.pause()

      try {
        const source = await hydrateSource(resolvedUrl)
        player.src = source
        player.currentTime = 0
        await player.play()
        console.log('[audio] playback started')

        if (auto) {
          autoPlayedOnce.add(resolvedUrl)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[audio] playback error:', message)
      }
    },
    [hydrateSource],
  )

  const clearAutoPlayCache = useCallback(() => {
    console.log('[audio] clearing auto-play cache')
    autoPlayedOnce.clear()
  }, [])

  useEffect(() => {
    // On mount: if this is the second mount (StrictMode), mark it
    if (!isStrictModeSecondMount) {
      console.log('[audio] first mount (StrictMode will remount)')
      isStrictModeSecondMount = true
    } else {
      console.log('[audio] subsequent mount (StrictMode done or restart)')
    }

    return () => {
      console.log('[audio] cleanup: pausing and releasing resources')
      releaseObjectUrl()
      audioRef.current?.pause()
      audioRef.current = null

      // Clear the autoplay cache on cleanup after StrictMode is done
      // This allows audio to replay on restart
      if (isStrictModeSecondMount) {
        console.log('[audio] clearing auto-play cache on cleanup')
        autoPlayedOnce.clear()
      }
    }
  }, [releaseObjectUrl])

  return { playAudio, clearAutoPlayCache }
}