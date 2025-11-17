export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <div className="rounded-full bg-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">Tutor</div>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
      </div>
    </div>
  )
}
