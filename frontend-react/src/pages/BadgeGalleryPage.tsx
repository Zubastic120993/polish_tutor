import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface Badge {
  code: string
  name: string
  description: string
  icon: string | null
}

interface UserBadge extends Badge {
  unlocked_at: string
}

interface AllBadgesResponse {
  badges: Badge[]
}

interface UserBadgesResponse {
  badges: UserBadge[]
}

interface BadgeDisplay extends Badge {
  unlocked: boolean
  unlockedAt?: string
}

export function BadgeGalleryPage() {
  const navigate = useNavigate()
  const [badges, setBadges] = useState<BadgeDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        // Fetch all badges and user badges in parallel
        const [allBadgesData, userBadgesData] = await Promise.all([
          apiFetch<AllBadgesResponse>(`${API_BASE}/api/v2/badges/all`),
          apiFetch<UserBadgesResponse>(`${API_BASE}/api/v2/user/1/badges`)
        ])

        // Create a map of unlocked badge codes
        const unlockedMap = new Map(
          userBadgesData.badges.map(ub => [ub.code, ub.unlocked_at])
        )

        // Merge all badges with unlock status
        const mergedBadges: BadgeDisplay[] = allBadgesData.badges.map(badge => ({
          ...badge,
          unlocked: unlockedMap.has(badge.code),
          unlockedAt: unlockedMap.get(badge.code)
        }))

        // Sort: unlocked first, then by code
        mergedBadges.sort((a, b) => {
          if (a.unlocked !== b.unlocked) {
            return a.unlocked ? -1 : 1
          }
          return a.code.localeCompare(b.code)
        })

        setBadges(mergedBadges)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load badges')
      } finally {
        setLoading(false)
      }
    }

    fetchBadges()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  const unlockedCount = badges.filter(b => b.unlocked).length
  const totalCount = badges.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Your Progress
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">Achievements</h1>
          <p className="mt-2 text-sm text-slate-600">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </motion.div>

        {/* Badge Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.code}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
            >
              <div
                className={`
                  rounded-2xl shadow-sm p-4 text-center relative overflow-hidden
                  ${badge.unlocked 
                    ? 'bg-white' 
                    : 'bg-slate-200 opacity-50'
                  }
                `}
              >
                {/* Icon */}
                <div className="mb-2">
                  <span className="text-4xl">
                    {badge.icon || '🏆'}
                  </span>
                </div>

                {/* Name */}
                <p className="mt-2 font-semibold text-sm text-slate-800">
                  {badge.name}
                </p>

                {/* Description */}
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {badge.description}
                </p>

                {/* Unlocked date (if unlocked) */}
                {badge.unlocked && badge.unlockedAt && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    {new Date(badge.unlockedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                )}

                {/* Locked Overlay */}
                {!badge.unlocked && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
                    <div className="text-center">
                      <span className="text-3xl">🔒</span>
                      <p className="mt-1 text-xs font-medium text-slate-600">Locked</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Badge History Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-6 text-center"
        >
          <Link
            to="/badge-history"
            className="text-sm text-amber-600 hover:underline"
          >
            View Badge History →
          </Link>
        </motion.div>

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          onClick={() => navigate('/')}
          className="w-full rounded-2xl bg-slate-800 py-4 font-medium text-white shadow-lg transition-all hover:bg-slate-700 active:scale-[0.98]"
        >
          Back to Home
        </motion.button>
      </div>
    </div>
  )
}

