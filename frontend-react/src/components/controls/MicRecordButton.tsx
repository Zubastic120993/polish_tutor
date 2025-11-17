import { useEffect, useState } from 'react'

interface Props {
  onMockResult: (transcript: string) => void
  disabled?: boolean
  suggestedText?: string
}

export function MicRecordButton({ onMockResult, disabled, suggestedText }: Props) {
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    if (!isRecording) return
    const timeout = setTimeout(() => {
      onMockResult(suggestedText ?? 'Powtarzam zdanie!')
      setIsRecording(false)
    }, 1200)
    return () => clearTimeout(timeout)
  }, [isRecording, onMockResult, suggestedText])

  return (
    <button
      type="button"
      disabled={disabled || isRecording}
      onClick={() => setIsRecording(true)}
      className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRecording ? 'Recording…' : 'Hold to speak'}
    </button>
  )
}
