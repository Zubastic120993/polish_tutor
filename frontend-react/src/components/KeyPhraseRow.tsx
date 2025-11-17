import { PlayButton } from './controls/PlayButton'
import type { LessonPhrase } from '../types/lesson'

interface Props {
  phrase: LessonPhrase
  onPlay: (phrase: LessonPhrase) => void
}

export function KeyPhraseRow({ phrase, onPlay }: Props) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <div>
        <p className="font-semibold text-slate-900">{phrase.pl}</p>
        <p className="text-xs text-slate-500">{phrase.en}</p>
      </div>
      <PlayButton onClick={() => onPlay(phrase)} label="Play" />
    </li>
  )
}
