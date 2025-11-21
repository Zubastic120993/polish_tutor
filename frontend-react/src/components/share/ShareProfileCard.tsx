import { forwardRef } from "react";

export interface ShareProfileCardProps {
  avatar: string;
  username: string;
  level: number;
  totalXP: number;
  nextLevelXP: number;
  currentStreak: number;
  totalSessions: number;
  bestBadges: { code: string; name: string; icon?: string }[];
  goalText?: string | null;
}

export const ShareProfileCard = forwardRef<HTMLDivElement, ShareProfileCardProps>(
  (
    {
      avatar,
      username,
      level,
      totalXP,
      nextLevelXP,
      currentStreak,
      totalSessions,
      bestBadges,
      goalText,
    },
    ref
  ) => {
    const progress = Math.min((totalXP / nextLevelXP) * 100, 100);

    return (
      <div
        ref={ref}
        className="w-[900px] mx-auto p-10 rounded-3xl bg-gradient-to-br from-slate-50 to-white shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">{avatar}</div>
          <h1 className="text-4xl font-extrabold text-slate-900">{username}</h1>
        </div>

        {/* Level */}
        <div className="mb-10">
          <p className="text-center text-lg font-semibold text-slate-800">
            Level {level}
          </p>
          <div className="w-full bg-slate-200 rounded-full h-6 mt-4 overflow-hidden">
            <div
              className="h-6 bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-slate-600 mt-2">
            {totalXP} XP / {nextLevelXP} XP
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm text-center">
            <p className="text-xs text-slate-600 font-medium">TOTAL XP</p>
            <p className="text-3xl font-bold text-amber-700 mt-2">{totalXP.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm text-center">
            <p className="text-xs text-slate-600 font-medium">SESSIONS</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">
              {totalSessions.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm text-center">
            <p className="text-xs text-slate-600 font-medium">CURRENT STREAK</p>
            <p className="text-3xl font-bold text-emerald-700 mt-2">
              {currentStreak} days
            </p>
          </div>
        </div>

        {/* Best Badges */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">
            Top Achievements
          </h2>

          {bestBadges.length === 0 ? (
            <p className="text-center text-slate-500">No achievements yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {bestBadges.slice(0, 4).map((badge) => (
                <div
                  key={badge.code}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center"
                >
                  <div className="text-4xl mb-2">{badge.icon || "🏅"}</div>
                  <p className="text-sm font-semibold text-slate-800">{badge.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal */}
        {goalText && (
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">🎯 Learning Goal</h3>
            <p className="text-center text-slate-700 text-lg">{goalText}</p>
          </div>
        )}
      </div>
    );
  }
);

ShareProfileCard.displayName = "ShareProfileCard";

