import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChatContainer } from '../components/ChatContainer'
import { KeyPhraseCard } from '../components/KeyPhraseCard'
import { ProgressIndicator } from '../components/controls/ProgressIndicator'
import { MicRecordButton } from '../components/controls/MicRecordButton'
import { useLessonState } from '../state/useLessonState'
import { useAudioQueue } from '../state/useAudioQueue'
import { getMockLesson } from '../lib/mockLessonProvider'

export function LessonChatPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const lesson = useMemo(() => getMockLesson(), [])
  const { state, currentPhrase, phraseIndex, messages, typing, sendUserMessage, summary } = useLessonState()
  const { playAudio } = useAudioQueue()
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (state === 'FINISHED') {
      navigate('/summary', { state: summary })
    }
  }, [state, summary, navigate])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    sendUserMessage(manualInput)
    setManualInput('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 p-6 text-slate-900">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Lesson</p>
          <h1 className="text-2xl font-bold">{id ?? lesson.id}</h1>
        </div>
        <div className="w-full max-w-sm">
          <ProgressIndicator current={Math.min(lesson.phrases.length, phraseIndex + 1)} total={lesson.phrases.length} />
        </div>
      </header>

      <main className="grid flex-1 gap-6 md:grid-cols-[2fr,1fr]">
        <section className="flex flex-col gap-4">
          <ChatContainer messages={messages} onPlayAudio={playAudio} showTyping={typing} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow">
            <label className="text-sm font-semibold text-slate-600">Type your response</label>
            <input
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="Write what you would say…"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-base focus:border-blue-400 focus:outline-none"
              disabled={state !== 'WAITING_FOR_USER'}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={state !== 'WAITING_FOR_USER' || !manualInput.trim()}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
              <MicRecordButton
                suggestedText={currentPhrase?.pl}
                onMockResult={sendUserMessage}
                disabled={state !== 'WAITING_FOR_USER'}
              />
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <KeyPhraseCard phrases={lesson.phrases} onPlayPhrase={(phrase) => playAudio(phrase.audioUrl)} />
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow">
            <p className="font-semibold text-slate-700">State</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-blue-500">{state}</p>
            <p className="mt-4 text-xs text-slate-400">Mock lesson for Phase A</p>
          </div>
        </aside>
      </main>
    </div>
  )
}
