interface Props {
  onClick: () => void
  label?: string
}

export function PlayButton({ onClick, label = 'Play' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
    >
      ▶<span>{label}</span>
    </button>
  )
}
