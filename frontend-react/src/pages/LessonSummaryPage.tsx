import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { MicroConfetti } from '../components/animation/MicroConfetti'

interface SummaryState {
  total: number
  correct: number
  attempts: Array<{ phraseId: string; passed: boolean; score: number }>
}

export function LessonSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const summary: SummaryState =
    (location.state as SummaryState | undefined) ?? {
      total: 0,
      correct: 0,
      attempts: [],
    }

  const accuracy = summary.total
    ? Math.round((summary.correct / summary.total) * 100)
    : 0

  const cardRef = useRef<HTMLDivElement | null>(null)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const [trigger, setTrigger] = useState(0)

  // Always fire confetti AFTER layout is final, even under StrictMode
  useEffect(() => {
    if (!cardRef.current) return

    // Delay ensures layout has fully stabilized
    const id = setTimeout(() => {
      const rect = cardRef.current!.getBoundingClientRect()
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
      setTrigger(Date.now()) // always unique → always fires
    }, 90)

    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">

      {/* 🎉 Confetti (portal) */}
      {origin && trigger !== 0 && (
        <MicroConfetti origin={origin} trigger={trigger} />
      )}

      <div
        ref={cardRef}
        className="w-full max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl animate-cardIn"
      >
        <h1 className="text-3xl font-bold text-slate-900">
          Lesson complete!
        </h1>

        <p className="mt-2 text-slate-500">
          You practiced {summary.total} phrases.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 text-left text-sm">
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase text-blue-600">
              Accuracy
            </p>
            <p className="mt-1 text-3xl font-bold text-blue-800">
              {accuracy}%
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-600">
              Correct
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-800">
              {summary.correct}/{summary.total}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(`/lesson/${summary.attempts?.[0]?.phraseId ?? 'lesson_mock_001'}`, {
              replace: true,
            })
          }
          className="mt-8 w-full rounded-full bg-blue-600 px-4 py-3 text-white shadow hover:bg-blue-500"
        >
          Restart lesson
        </button>

        <Link
          to="/lesson/lesson_mock_001"
          className="mt-4 block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Start next lesson →
        </Link>
      </div>
    </div>
  )
}