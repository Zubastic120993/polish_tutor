import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { apiFetch } from "../../lib/apiClient"

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface DailyGoalCardProps {
  goalText: string | null
  onGoalUpdated: (newGoal: string | null) => void
  userId?: number
}

export function DailyGoalCard({ goalText, onGoalUpdated, userId = 1 }: DailyGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [input, setInput] = useState(goalText ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveGoal() {
    try {
      setLoading(true)
      setError(null)
      
      // Get current profile to preserve username and avatar
      const currentProfile = await apiFetch(`${API_BASE}/api/v2/user/${userId}/profile-info`)
      
      await apiFetch(`${API_BASE}/api/v2/user/${userId}/profile-info`, {
        method: "PUT",
        body: JSON.stringify({
          username: currentProfile.username,
          avatar: currentProfile.avatar,
          goal_text: input,
          goal_created_at: new Date().toISOString(),
        }),
      })
      
      onGoalUpdated(input)
      setIsEditing(false)
    } catch (e) {
      setError("Failed to save goal")
      console.error("Failed to save goal:", e)
    } finally {
      setLoading(false)
    }
  }

  async function clearGoal() {
    try {
      setLoading(true)
      setError(null)
      
      // Get current profile to preserve username and avatar
      const currentProfile = await apiFetch(`${API_BASE}/api/v2/user/${userId}/profile-info`)
      
      await apiFetch(`${API_BASE}/api/v2/user/${userId}/profile-info`, {
        method: "PUT",
        body: JSON.stringify({
          username: currentProfile.username,
          avatar: currentProfile.avatar,
          goal_text: null,
          goal_created_at: null,
        }),
      })
      
      onGoalUpdated(null)
      setIsEditing(false)
      setInput("")
    } catch (e) {
      setError("Failed to clear goal")
      console.error("Failed to clear goal:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl bg-white p-4 sm:p-6 md:p-8 shadow-[0_4px_14px_rgba(15,23,42,0.06)] border border-blue-100
                 transition-all duration-300 hover:shadow-md active:scale-[0.98]
                 focus-within:ring-2 focus-within:ring-blue-400 cursor-pointer touch-target"
    >
      {/* Blue/indigo gradient overlay - consistent pattern */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-50/45 via-indigo-50/25 to-transparent opacity-[0.28] sm:opacity-[0.4]" />
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 relative z-10">Today's Goal</h2>
      <p className="text-sm text-slate-600 mb-4 relative z-10">
        Stay consistent and keep moving forward 💪
      </p>

      {/* NOT EDITING */}
      {!isEditing && (
        <div className="relative z-10">
          {goalText ? (
            <motion.div
              initial={{ opacity: 0.5, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold text-slate-800 mb-4"
            >
              {goalText}
            </motion.div>
          ) : (
            <p className="text-slate-500 italic mb-4">No goal set yet</p>
          )}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2
                         transition-all duration-300 ease-out
                         hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]
                         relative
                         before:absolute before:inset-0 before:rounded-lg
                         before:bg-gradient-to-r before:from-indigo-400/20 before:to-indigo-500/20
                         before:blur-xl before:opacity-0 hover:before:opacity-100"
            >
              {goalText ? (
                <>
                  <motion.span
                    className="text-lg"
                    whileHover={{ scale: 1.2 }}
                    animate={{ opacity: [1, 0.85, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    ✏️
                  </motion.span>
                  Edit Goal
                </>
              ) : (
                "Set Goal"
              )}
            </motion.button>
            {goalText && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearGoal}
                disabled={loading}
                className="rounded-xl bg-red-500 text-white px-3 py-2 font-semibold 
                           transition-all duration-300 ease-out
                           hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)]
                           relative before:absolute before:inset-0 before:rounded-xl
                           before:bg-red-400/20 before:blur-xl
                           before:opacity-0 hover:before:opacity-100
                           disabled:opacity-40"
              >
                Clear Goal 🗑️
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODE */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mt-3 relative z-10"
          >
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-slate-800 bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your daily learning goal..."
            />
            {error && (
              <p className="text-red-600 mt-1 text-sm">{error}</p>
            )}
            <div className="flex gap-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveGoal}
                disabled={loading}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold
                           transition-all duration-300 ease-out
                           hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)]
                           relative before:absolute before:inset-0 before:rounded-xl
                           before:bg-emerald-400/20 before:blur-xl
                           before:opacity-0 hover:before:opacity-100
                           disabled:opacity-40 flex items-center gap-2"
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <motion.span
                      className="text-lg"
                      whileHover={{ scale: 1.2 }}
                      animate={{ opacity: [1, 0.85, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      ✓
                    </motion.span>
                    Save
                  </>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsEditing(false)
                  setInput(goalText ?? "")
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 disabled:opacity-40"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

