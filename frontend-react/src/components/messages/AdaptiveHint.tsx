interface Props {
  type?: 'pronunciation' | 'word_choice' | 'missing_word' | 'order' | null
  recommendation?: 'slow_down' | 'repeat_focus_word' | 'repeat_core' | 'full_retry' | 'proceed'
  focusWord?: string | null
}

const baseText: Record<Exclude<Props['type'], null | undefined>, string> = {
  pronunciation: 'Spróbuj wolniej i wyraźnie zaakcentuj samogłoski.',
  word_choice: 'Użyj właściwego słowa.',
  missing_word: 'Brakuje ważnego słowa — sprawdź szyk.',
  order: 'Spróbuj poprawić kolejność słów.',
}

export function AdaptiveHint({ type, recommendation, focusWord }: Props) {
  if (!type) return null
  let message = baseText[type]

  if (type === 'word_choice') {
    message = focusWord ? `Użyj słowa: ${focusWord}.` : 'Wybierz właściwe słowo z frazy.'
  }

  if (type === 'pronunciation' && recommendation === 'slow_down') {
    message = 'Spróbuj wolniej i wyraźnie zaakcentuj samogłoski.'
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 shadow-sm animate-fadeIn">
      <div className="absolute inset-0 opacity-30 shimmer" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="font-medium">{message}</p>
      </div>
    </div>
  )
}
