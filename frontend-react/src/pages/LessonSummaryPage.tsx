import { Link, useLocation, useNavigate } from 'react-router-dom'

interface SummaryState {
  total: number
  correct: number
  attempts: Array<{ phraseId: string; passed: boolean; score: number }>
}

export function LessonSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const summary = (location.state as SummaryState | undefined) ?? {
    total: 0,
    correct: 0,
    attempts: [],
  }

  const accuracy = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Lesson complete!</h1>
        <p className="mt-2 text-slate-500">You practiced {summary.total} phrases.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase text-blue-600">Accuracy</p>
            <p className="text-3xl font-bold text-blue-700">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-600">Correct</p>
            <p className="text-3xl font-bold text-emerald-700">
              {summary.correct}/{summary.total}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/lesson/lesson_mock_001', { replace: true })}
          className="mt-8 w-full rounded-full bg-blue-600 px-4 py-3 text-white shadow hover:bg-blue-500"
        >
          Restart lesson
        </button>

        <Link to="/lesson/lesson_mock_001" className="mt-4 block text-sm text-blue-600">
          Start next lesson →
        </Link>
      </div>
    </div>
  )
}
