import { useEffect, useRef, useState } from "react";
import { ShareProfileCard } from "../components/share/ShareProfileCard";
import { apiFetch } from "../lib/apiClient";
import { exportElementAsPng } from "../utils/exportImage";
import { exportElementAsPdf } from "../utils/exportPdf";
import type { ProfileResponse } from "../types/profile";

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function ShareProfilePage() {
  const ref = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const p = await apiFetch<ProfileResponse>(
          `${API_BASE}/api/v2/user/1/profile-info`
        );
        setProfile(p);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return <p className="p-6 text-center text-slate-500">Loading...</p>;
  }

  if (!profile) {
    return <p className="p-6 text-center text-red-500">Failed to load profile.</p>;
  }

  const nextLevelXP = (profile.level + 1) * 2000;

  const handleExport = async () => {
    if (!ref.current) return;
    setExporting(true);

    await exportElementAsPng(ref.current, "profile-card.png", {
      onFinish: () => setExporting(false)
    });
  };

  const handleExportPdf = async () => {
    if (!ref.current) return;
    setExportingPdf(true);

    await exportElementAsPdf(ref.current, "profile-card.pdf", {
      onFinish: () => setExportingPdf(false)
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        Share Your Profile
      </h1>

      <div className="flex justify-center mb-8">
        <ShareProfileCard
          ref={ref}
          avatar={profile.avatar}
          username={profile.username}
          level={profile.level}
          totalXP={profile.total_xp}
          nextLevelXP={nextLevelXP}
          currentStreak={profile.current_streak}
          totalSessions={profile.total_sessions}
          bestBadges={profile.best_badges}
          goalText={profile.goal_text}
        />
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-xl bg-amber-500 px-8 py-4 text-white font-semibold shadow hover:bg-amber-600 disabled:opacity-50 transition"
        >
          {exporting ? "Exporting…" : "📥 Export as PNG"}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="rounded-xl bg-blue-500 px-8 py-4 text-white font-semibold shadow hover:bg-blue-600 disabled:opacity-50 transition"
        >
          {exportingPdf ? "Exporting…" : "📄 Export as PDF"}
        </button>
      </div>
    </div>
  );
}

