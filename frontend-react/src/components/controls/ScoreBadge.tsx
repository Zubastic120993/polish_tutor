interface Props {
  score: number
}

export function ScoreBadge({ score }: Props) {
  const percent = Math.round(score * 100)
  const status = percent >= 85 ? 'Perfect' : percent >= 70 ? 'Good' : 'Retry'
  const color = percent >= 85 ? 'bg-emerald-100 text-emerald-700' : percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'

  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {status} · {percent}%
    </div>
  )
}
