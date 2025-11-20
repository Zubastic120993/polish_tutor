import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/apiClient';
import type { BadgeHistoryItem, BadgeHistoryResponse } from '../types/badgeHistory';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export function BadgeHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<BadgeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // TODO: Replace with actual user ID from auth context
        const userId = 1;

        const response = await apiFetch<BadgeHistoryResponse>(
          `${API_BASE}/api/v2/user/${userId}/badge-history`
        );

        setHistory(response.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-slate-500">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-8 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Your Journey
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Badge History</h1>
          <p className="mt-1 text-sm text-slate-500">
            {history.length} {history.length === 1 ? 'achievement' : 'achievements'} unlocked
          </p>
        </motion.div>

        {/* Empty State */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl bg-white p-8 text-center shadow-sm"
          >
            <p className="text-4xl">🏆</p>
            <p className="mt-4 text-slate-600">No badges unlocked yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Keep practicing to earn your first achievement!
            </p>
          </motion.div>
        )}

        {/* Timeline */}
        {history.length > 0 && (
          <div className="relative">
            {history.map((item, index) => (
              <motion.div
                key={`${item.code}-${item.unlocked_at}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="relative flex pb-8"
              >
                {/* Left Column: Icon & Line */}
                <div className="relative flex w-12 flex-col items-center">
                  {/* Badge Icon Circle */}
                  <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow">
                    <span className="text-xl">{item.icon || '🏅'}</span>
                  </div>

                  {/* Vertical Line (don't show for last item) */}
                  {index < history.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-200" />
                  )}
                </div>

                {/* Right Column: Content Card */}
                <div className="ml-6 flex-1 rounded-xl bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Unlocked on {new Date(item.unlocked_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: history.length * 0.08 + 0.1 }}
          className="mt-8 space-y-3"
        >
          {/* View All Badges Link */}
          <Link
            to="/badges"
            className="block text-center text-sm text-amber-600 hover:underline"
          >
            View all achievements →
          </Link>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow hover:bg-slate-50"
          >
            Back
          </button>
        </motion.div>
      </div>
    </div>
  );
}

