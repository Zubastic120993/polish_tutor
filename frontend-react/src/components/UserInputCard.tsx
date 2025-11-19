import { FormEventHandler } from 'react'
import { MicRecordButton } from './controls/MicRecordButton'

interface Props {
  manualInput: string
  onChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  canRespond: boolean
  isRecording: boolean
  isTranscribing: boolean
  onToggleMic: () => void
  speechError?: string | null
  className?: string
  amplitude?: number
  elapsedSeconds?: number
  disabled?: boolean
  micClassName?: string
}

export function UserInputCard({
  manualInput,
  onChange,
  onSubmit,
  canRespond,
  isRecording,
  isTranscribing,
  onToggleMic,
  speechError,
  className = '',
  amplitude = 0,
  elapsedSeconds = 0,
  disabled = false,
  micClassName = '',
}: Props) {
  const blocked = disabled || !canRespond
  const sendDisabled = blocked || !manualInput.trim()

  return (
    <form
      onSubmit={onSubmit}
      className={`sticky bottom-0 mt-4 space-y-3 rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-lg shadow-slate-200/60 backdrop-blur-xl ${className}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500">Your turn</p>
        <p className="text-base font-semibold text-slate-900">Type or speak your response</p>
      </div>
      <textarea
        value={manualInput}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write what you would say…"
        rows={3}
        disabled={blocked}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-800 shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sendDisabled}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-300 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
        <MicRecordButton
          disabled={blocked}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onToggle={onToggleMic}
          amplitude={amplitude}
          elapsedSeconds={elapsedSeconds}
          className={micClassName}
        />
        {speechError && <p className="text-sm text-rose-500">{speechError}</p>}
      </div>
    </form>
  )
}
