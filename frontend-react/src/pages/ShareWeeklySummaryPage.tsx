import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShareWeeklySummaryCard,
  type ShareWeeklySummaryCardProps,
} from "../components/share/ShareWeeklySummaryCard";
import { apiFetch } from "../lib/apiClient";
import { exportElementAsPng } from "../utils/exportImage";
import { exportElementAsPdf } from "../utils/exportPdf";
import type { WeeklyStatsResponse } from "../types/weekly";
import type { BadgeHistoryResponse } from "../types/badgeHistory";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Get the start and end of the current week (Monday to Sunday)
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days to subtract to get to Monday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export default function ShareWeeklySummaryPage() {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [summaryData, setSummaryData] = useState<ShareWeeklySummaryCardProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWeeklySummary() {
      try {
        setLoading(true);
        setError(null);

        // Fetch weekly stats and badge history in parallel
        const [weeklyStats, badgeHistory] = await Promise.all([
          apiFetch<WeeklyStatsResponse>(
            `${API_BASE}/api/v2/practice/weekly-stats?user_id=1`
          ),
          apiFetch<BadgeHistoryResponse>(
            `${API_BASE}/api/v2/user/1/badge-history`
          ),
        ]);

        // Calculate week range
        const { start, end } = getWeekRange();

        // Count days practiced (days with sessions > 0)
        const daysPracticed = weeklyStats.days.filter(
          (day) => day.sessions > 0
        ).length;

        // Find the most recent badge unlocked this week (best badge)
        const weekStart = new Date(start);
        const weekEnd = new Date(end);
        
        const badgesThisWeek = badgeHistory.history.filter((badge) => {
          const unlockedDate = new Date(badge.unlocked_at);
          return unlockedDate >= weekStart && unlockedDate <= weekEnd;
        });

        // Sort by unlock date (most recent first) and take the first one
        const bestBadge = badgesThisWeek.length > 0
          ? {
              code: badgesThisWeek[0].code,
              name: badgesThisWeek[0].name,
              icon: badgesThisWeek[0].icon || "🏅",
            }
          : null;

        // Build summary data
        const summary: ShareWeeklySummaryCardProps = {
          weekStart: start,
          weekEnd: end,
          totalXp: weeklyStats.total_xp,
          daysPracticed,
          bestBadge,
          streak: weeklyStats.weekly_streak, // Use weekly streak from API
        };

        setSummaryData(summary);
      } catch (err) {
        console.error("Failed to load weekly summary:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load weekly summary"
        );
      } finally {
        setLoading(false);
      }
    }

    loadWeeklySummary();
  }, []);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);

    const { start, end } = getWeekRange();
    const fileName = `weekly-summary-${start}-to-${end}.png`;

    await exportElementAsPng(cardRef.current, fileName, {
      onFinish: () => setExporting(false),
    });
  };

  const handleExportPdf = async () => {
    if (!cardRef.current) return;
    setExportingPdf(true);

    const { start, end } = getWeekRange();
    const fileName = `weekly-summary-${start}-to-${end}.pdf`;

    await exportElementAsPdf(cardRef.current, fileName, {
      onFinish: () => setExportingPdf(false),
    });
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Trigger re-fetch by changing a state (useEffect will re-run)
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-4xl mb-4">📊</div>
          <p className="text-slate-500 text-lg">Loading weekly summary...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !summaryData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto"
        >
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Couldn't Load Weekly Summary
          </h2>
          <p className="text-slate-600 mb-6">
            {error || "Unknown error occurred"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-500 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/weekly-stats")}
              className="rounded-xl bg-slate-200 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-300 transition"
            >
              Back to Stats
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success - render card
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 mb-2">
            Share Your Progress
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Weekly Summary
          </h1>
        </motion.div>

        {/* Weekly Summary Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <ShareWeeklySummaryCard ref={cardRef} {...summaryData} />
        </motion.div>

        {/* Export button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting…
              </span>
            ) : (
              "📥 Export as PNG"
            )}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
          >
            {exportingPdf ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting…
              </span>
            ) : (
              "📄 Export as PDF"
            )}
          </button>

          <button
            onClick={() => navigate("/weekly-stats")}
            className="rounded-xl bg-slate-200 px-8 py-4 text-slate-700 font-semibold hover:bg-slate-300 transition-colors duration-200"
          >
            Back to Weekly Stats
          </button>
        </motion.div>

        {/* Usage hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            💡 Share your weekly progress on social media or with your study
            group to stay motivated!
          </p>
        </motion.div>
      </div>
    </div>
  );
}

