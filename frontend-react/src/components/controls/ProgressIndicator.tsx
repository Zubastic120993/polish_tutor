interface Props {
  current: number
  total: number
}

export function ProgressIndicator({ current, total }: Props) {
  const percent = Math.min(100, Math.round((current / total) * 100))
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>
          Phrase {current} / {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
