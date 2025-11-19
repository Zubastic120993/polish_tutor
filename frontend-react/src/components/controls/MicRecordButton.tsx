import { WaveformVisualizer } from './WaveformVisualizer'

interface Props {
  disabled?: boolean
  isRecording: boolean
  isTranscribing: boolean
  onToggle: () => void
  amplitude?: number
  elapsedSeconds?: number
  className?: string
}

const formatTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, seconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function MicRecordButton({
  disabled,
  isRecording,
  isTranscribing,
  onToggle,
  amplitude = 0,
  elapsedSeconds = 0,
  className = '',
}: Props) {
  const showWaveform = isRecording || isTranscribing
  const label = isRecording ? 'Recording…' : isTranscribing ? 'Processing…' : 'Tap to speak'
  const subtext = isRecording
    ? 'Speak naturally while we listen'
    : isTranscribing
      ? 'Hold tight while we transcribe'
      : 'You can record up to 10 seconds'

  const baseClasses =
    'flex w-full items-center gap-4 rounded-2xl border px-5 py-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70'
  const toneClasses = isRecording
    ? 'border-rose-500 bg-rose-600 text-white hover:bg-rose-600'
    : isTranscribing
      ? 'border-amber-400 bg-amber-500 text-white hover:bg-amber-500'
      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isTranscribing}
      className={`${baseClasses} ${toneClasses} ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full">
          {isRecording && (
            <span className="absolute inset-0 rounded-full border border-white/70 opacity-70 animate-ping" aria-hidden="true" />
          )}
          <span
            className={`relative flex h-12 w-12 items-center justify-center rounded-full ${
              isRecording || isTranscribing ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-6v3a5 5 0 0 1-10 0V9H5v3a7 7 0 0 0 6 6.92V21H9v2h6v-2h-2v-2.08A7 7 0 0 0 19 12V9Z" />
            </svg>
          </span>
        </div>
        {isRecording && (
          <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-xs text-white shadow-sm">{formatTime(elapsedSeconds)}</span>
        )}
      </div>
      <div className="flex flex-col text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`text-xs ${isRecording || isTranscribing ? 'text-white/80' : 'text-slate-500'}`}>{subtext}</span>
      </div>
      {showWaveform && (
        <div className="ml-auto">
          <WaveformVisualizer amplitude={amplitude} />
        </div>
      )}
    </button>
  )
}
