import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShareAchievementCard,
  ACHIEVEMENT_COLORS,
  type AchievementShareProps,
} from "../components/share/ShareAchievementCard";
import { apiFetch } from "../lib/apiClient";
import { exportElementAsPng } from "../utils/exportImage";
import { exportElementAsPdf } from "../utils/exportPdf";
import type { ProfileResponse } from "../types/profile";
import type { BadgeHistoryResponse } from "../types/badgeHistory";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Badge definitions interface (from all badges endpoint)
interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string | null;
}

interface AllBadgesResponse {
  badges: Badge[];
}

// Format date to long format
function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Color palette mapping for different achievement types
function getColorForAchievement(code: string): {
  accent: string;
  gradient: string;
} {
  // Level achievements
  if (code.startsWith("LEVEL_")) {
    return ACHIEVEMENT_COLORS.gold;
  }

  // XP milestones
  if (code.startsWith("XP_")) {
    return ACHIEVEMENT_COLORS.purple;
  }

  // Badge-specific color mapping (customizable)
  const badgeColorMap: Record<string, keyof typeof ACHIEVEMENT_COLORS> = {
    PERFECT_DAY: "emerald",
    FIRST_SESSION: "blue",
    STREAK_3: "orange",
    STREAK_7: "orange",
    STREAK_30: "orange",
    SESSIONS_10: "blue",
    SESSIONS_50: "blue",
    SESSIONS_100: "blue",
    XP_1000: "purple",
    XP_5000: "purple",
    XP_10000: "purple",
  };

  const colorKey = badgeColorMap[code] || "blue";
  return ACHIEVEMENT_COLORS[colorKey];
}

export default function ShareAchievementPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [achievement, setAchievement] = useState<AchievementShareProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAchievement() {
      if (!code) {
        setError("No achievement code provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch data in parallel
        const [profileData, allBadgesData, badgeHistoryData] = await Promise.all([
          apiFetch<ProfileResponse>(`${API_BASE}/api/v2/user/1/profile-info`),
          apiFetch<AllBadgesResponse>(`${API_BASE}/api/v2/badges/all`),
          apiFetch<BadgeHistoryResponse>(`${API_BASE}/api/v2/user/1/badge-history`),
        ]);

        let achievementData: AchievementShareProps | null = null;

        // Type A: Badge unlock
        const badgeMatch = allBadgesData.badges.find((b) => b.code === code);
        if (badgeMatch) {
          const historyItem = badgeHistoryData.history.find((h) => h.code === code);

          if (!historyItem) {
            setError("Badge not yet unlocked");
            setLoading(false);
            return;
          }

          const colors = getColorForAchievement(code);
          achievementData = {
            title: badgeMatch.name,
            description: badgeMatch.description,
            icon: badgeMatch.icon || historyItem.icon || "🏅",
            accentColor: colors.accent,
            bgGradient: colors.gradient,
            date: formatLongDate(historyItem.unlocked_at),
          };
        }

        // Type B: Level achievement (LEVEL_X)
        else if (code.match(/^LEVEL_(\d+)$/)) {
          const levelMatch = code.match(/^LEVEL_(\d+)$/);
          const levelNum = levelMatch ? parseInt(levelMatch[1], 10) : 0;

          // Check if user has reached this level
          if (profileData.level < levelNum) {
            setError(`Level ${levelNum} not yet reached`);
            setLoading(false);
            return;
          }

          const colors = getColorForAchievement(code);
          achievementData = {
            title: `Level ${levelNum} Unlocked!`,
            description: `You reached Level ${levelNum}. Keep going!`,
            icon: "🏆",
            accentColor: colors.accent,
            bgGradient: colors.gradient,
            date: formatLongDate(new Date().toISOString()), // Use today's date as fallback
          };
        }

        // Type C: XP milestone (XP_1000, XP_5000, etc.)
        else if (code.match(/^XP_(\d+)$/)) {
          const xpMatch = code.match(/^XP_(\d+)$/);
          const xpMilestone = xpMatch ? parseInt(xpMatch[1], 10) : 0;

          // Check if user has reached this XP
          if (profileData.total_xp < xpMilestone) {
            setError(`${xpMilestone} XP milestone not yet reached`);
            setLoading(false);
            return;
          }

          const colors = getColorForAchievement(code);
          achievementData = {
            title: `${xpMilestone.toLocaleString()} XP Milestone!`,
            description: `You've earned ${xpMilestone.toLocaleString()} total experience points. Amazing progress!`,
            icon: "⭐",
            accentColor: colors.accent,
            bgGradient: colors.gradient,
            date: formatLongDate(new Date().toISOString()), // Use today's date as fallback
          };
        }

        // Invalid code
        else {
          setError("Invalid achievement code");
          setLoading(false);
          return;
        }

        setAchievement(achievementData);
      } catch (err) {
        console.error("Failed to load achievement:", err);
        setError(err instanceof Error ? err.message : "Failed to load achievement");
      } finally {
        setLoading(false);
      }
    }

    loadAchievement();
  }, [code]);

  // Redirect to badges page if invalid
  useEffect(() => {
    if (error && !loading) {
      const timer = setTimeout(() => {
        navigate("/badges");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, loading, navigate]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);

    await exportElementAsPng(cardRef.current, `achievement-${code}.png`, {
      onFinish: () => setExporting(false),
    });
  };

  const handleExportPdf = async () => {
    if (!cardRef.current) return;
    setExportingPdf(true);

    await exportElementAsPdf(cardRef.current, `achievement-${code}.pdf`, {
      onFinish: () => setExportingPdf(false),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-4xl mb-4">✨</div>
          <p className="text-slate-500">Loading achievement...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !achievement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Achievement Not Found
          </h2>
          <p className="text-slate-600 mb-6">{error || "Unknown error"}</p>
          <p className="text-sm text-slate-500">Redirecting to badges...</p>
        </motion.div>
      </div>
    );
  }

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
            Share Your Achievement
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Export & Share
          </h1>
        </motion.div>

        {/* Achievement card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <ShareAchievementCard ref={cardRef} {...achievement} />
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
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
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
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
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
            onClick={() => navigate("/badges")}
            className="rounded-xl bg-slate-200 px-8 py-4 text-slate-700 font-semibold hover:bg-slate-300 transition-colors duration-200"
          >
            Back to Badges
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
            💡 Share your achievement on social media, with friends, or save it
            to your collection!
          </p>
        </motion.div>
      </div>
    </div>
  );
}

