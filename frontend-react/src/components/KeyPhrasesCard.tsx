import type { LessonPhrase } from '../types/lesson'

interface Props {
  phrases: LessonPhrase[]
  activePhraseId?: string
  onPlayPhrase: (phrase: LessonPhrase) => void
}

export function KeyPhrasesCard({ phrases, activePhraseId, onPlayPhrase }: Props) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Key phrases</p>
          <p className="text-lg font-semibold text-slate-900">Today&apos;s focus</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {phrases.length} total
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {phrases.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            Brak fraz do wyświetlenia.
          </li>
        )}
        {phrases.map((phrase, index) => {
          const isActive = phrase.id === activePhraseId
          return (
            <li
              key={phrase.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? 'border-blue-200 bg-blue-50/70'
                  : 'border-slate-100 bg-slate-50/60 hover:border-slate-200'
              }`}
            >
              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-500">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{phrase.pl}</p>
                <p className="text-xs text-slate-500">{phrase.en}</p>
              </div>
              {phrase.audioUrl && (
                <button
                  type="button"
                  onClick={() => onPlayPhrase(phrase)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                >
                  <span aria-hidden="true">▶</span>
                  Play
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
