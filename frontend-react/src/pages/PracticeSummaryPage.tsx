import { useLocation, useNavigate } from 'react-router-dom'
import type { PracticeSummary } from '../types/practice'
import { DEFAULT_LESSON_ID } from '../constants/lessons'

export function PracticeSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const summary: PracticeSummary =
    (location.state as PracticeSummary | undefined) ?? {
      packId: 'daily_pack',
      total: 0,
      correct: 0,
      attempts: [],
    }

  const accuracy = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
          Daily Practice
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Pack complete!</h1>
        <p className="mt-1 text-sm text-slate-500">Pack ID: {summary.packId}</p>

        <div className="mt-8 grid grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase text-blue-600">Accuracy</p>
            <p className="mt-2 text-3xl font-bold text-blue-800">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-600">Correct</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {summary.correct}/{summary.total}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
          onClick={() => navigate('/practice', { replace: true })}
          className="w-full rounded-full bg-blue-600 px-4 py-3 text-white shadow hover:bg-blue-500"
        >
          Do again
        </button>
        <button
          type="button"
          onClick={() => navigate(`/lesson/${DEFAULT_LESSON_ID}`, { replace: true })}
          className="w-full rounded-full border border-slate-200 px-4 py-3 font-semibold text-slate-700 shadow hover:bg-slate-50"
        >
          Return Home
        </button>
        </div>
      </div>
    </div>
  )
}
