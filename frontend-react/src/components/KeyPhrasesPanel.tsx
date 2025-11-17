import { useState } from 'react'
import type { LessonPhrase } from '../types/lesson'
import { KeyPhraseRow } from './KeyPhraseRow'

interface Props {
  phrases: LessonPhrase[]
  onPlayPhrase: (phrase: LessonPhrase) => void
}

export function KeyPhrasesPanel({ phrases, onPlayPhrase }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-600"
      >
        Key phrases
        <span>{open ? '▼' : '▲'}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {phrases.map((phrase) => (
            <KeyPhraseRow key={phrase.id} phrase={phrase} onPlay={onPlayPhrase} />
          ))}
        </ul>
      )}
    </div>
  )
}
