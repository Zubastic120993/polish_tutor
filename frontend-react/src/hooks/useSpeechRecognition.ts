import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechRecognitionResponse } from '../types/api'
import { apiFetch } from '../lib/apiClient'

const BASE = import.meta.env.VITE_API_BASE ?? ''

async function sendAudioPayload(audioBase64: string): Promise<SpeechRecognitionResponse> {
  return apiFetch<SpeechRecognitionResponse>(`${BASE}/api/v2/speech/recognize`, {
    method: 'POST',
    body: JSON.stringify({ audio_base64: audioBase64 }),
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function encodeWavBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
  const channelData = audioBuffer.getChannelData(0)
  const buffer = new ArrayBuffer(44 + channelData.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + channelData.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, audioBuffer.sampleRate, true)
  view.setUint32(28, audioBuffer.sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, channelData.length * 2, true)

  let offset = 44
  for (let i = 0; i < channelData.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channelData[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return buffer
}

async function blobToWavBase64(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    const wavBuffer = encodeWavBuffer(audioBuffer)
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
    return blobToBase64(wavBlob)
  } catch {
    return blobToBase64(blob)
  }
}

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amplitude, setAmplitude] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Float32Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const autoStopTimeoutRef = useRef<number | null>(null)

  const mutation = useMutation({
    mutationFn: (audioBase64: string) => sendAudioPayload(audioBase64),
  })

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (autoStopTimeoutRef.current) {
      window.clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
    startTimeRef.current = null
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    analyserRef.current = null
    dataArrayRef.current = null
  }, [])

  const resetMeters = useCallback(() => {
    setAmplitude(0)
    setElapsedSeconds(0)
  }, [])

  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) return null
    stopVisualization()
    setIsRecording(false)
    setIsTranscribing(true)

    const recorder = mediaRecorderRef.current

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        cleanupStream()
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.stop()
    })

    try {
      const audioBase64 = await blobToWavBase64(blob)
      const result = await mutation.mutateAsync(audioBase64)
      setIsTranscribing(false)
      resetMeters()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech recognition failed')
      setIsTranscribing(false)
      resetMeters()
      return null
    }
  }, [cleanupStream, isRecording, mutation, resetMeters, stopVisualization])

  const startRecording = useCallback(async () => {
    if (isRecording) return
    if (!navigator.mediaDevices) {
      setError('Recording not supported in this browser')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        cleanupStream()
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      streamRef.current = stream
      setError(null)
      resetMeters()
      startTimeRef.current = Date.now()

      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        setError('Web Audio API not supported')
        return
      }
      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      const dataArray = new Float32Array(analyser.fftSize)
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray

      const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return
        const buffer = dataArrayRef.current
        analyserRef.current.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>)
        let sumSquares = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const value = buffer[i]
          sumSquares += value * value
        }
        const rms = Math.sqrt(sumSquares / buffer.length)
        const normalized = Math.min(1, rms * 3)
        setAmplitude(normalized)
        animationFrameRef.current = requestAnimationFrame(tick)
      }
      tick()

      timerIntervalRef.current = window.setInterval(() => {
        if (!startTimeRef.current) return
        const elapsed = Math.min(10, Math.floor((Date.now() - startTimeRef.current) / 1000))
        setElapsedSeconds(elapsed)
      }, 200)

      autoStopTimeoutRef.current = window.setTimeout(() => {
        stopRecording().catch(() => null)
      }, 10000)

      setIsRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
    }
  }, [cleanupStream, isRecording, resetMeters, stopRecording])

  const resetError = useCallback(() => setError(null), [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      cleanupStream()
      stopVisualization()
      resetMeters()
    }
  }, [cleanupStream, resetMeters, stopVisualization])

  return {
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    error,
    resetError,
    amplitude,
    elapsedSeconds,
  }
}
