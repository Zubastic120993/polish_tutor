import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/apiClient';
import type { ProfileResponse } from '../types/profile';
import type { UserProfileResponse } from '../types/userProfile';
import { EmojiPickerModal } from '../components/profile/EmojiPickerModal';
import { GoalCard } from '../components/profile/GoalCard';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User profile state (now with backend persistence)
  const [username, setUsername] = useState('Learner');
  const [avatar, setAvatar] = useState('🙂');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(username);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  // Learning goal state
  const [goalText, setGoalText] = useState<string | null>(null);
  const [goalCreatedAt, setGoalCreatedAt] = useState<string | null>(null);

  // Edit handlers
  const handleEditClick = () => {
    setDraftName(username);
    setEditing(true);
  };

  const handleSaveClick = async () => {
    const trimmedName = draftName.trim() || 'Learner';
    setSaving(true);
    
    try {
      // TODO: Replace with actual user ID from auth context
      const userId = 1;
      
      await apiFetch<UserProfileResponse>(
        `${API_BASE}/api/v2/user/${userId}/profile-info`,
        {
          method: 'PUT',
          body: JSON.stringify({
            username: trimmedName,
            avatar: avatar,
            goal_text: goalText,
            goal_created_at: goalCreatedAt,
          }),
        }
      );
      
      setUsername(trimmedName);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    setDraftName(username);
    setEditing(false);
  };

  const handleEditGoal = async (newGoalText: string) => {
    try {
      // TODO: Replace with actual user ID from auth context
      const userId = 1;
      
      const newCreatedAt = new Date().toISOString();
      
      const updatedProfile = await apiFetch<UserProfileResponse>(
        `${API_BASE}/api/v2/user/${userId}/profile-info`,
        {
          method: 'PUT',
          body: JSON.stringify({
            username: username,
            avatar: avatar,
            goal_text: newGoalText,
            goal_created_at: newCreatedAt,
          }),
        }
      );
      
      setGoalText(updatedProfile.goal_text || null);
      setGoalCreatedAt(updatedProfile.goal_created_at || null);
    } catch (err) {
      console.error('Failed to save goal:', err);
      alert('Failed to save goal. Please try again.');
    }
  };

  const handleClearGoal = async () => {
    try {
      // TODO: Replace with actual user ID from auth context
      const userId = 1;
      
      const updatedProfile = await apiFetch<UserProfileResponse>(
        `${API_BASE}/api/v2/user/${userId}/profile-info`,
        {
          method: 'PUT',
          body: JSON.stringify({
            username: username,
            avatar: avatar,
            goal_text: null,
            goal_created_at: null,
          }),
        }
      );
      
      setGoalText(updatedProfile.goal_text || null);
      setGoalCreatedAt(updatedProfile.goal_created_at || null);
    } catch (err) {
      console.error('Failed to clear goal:', err);
      alert('Failed to clear goal. Please try again.');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // TODO: Replace with actual user ID from auth context
        const userId = 1;

        // Fetch main profile stats
        const data = await apiFetch<ProfileResponse>(
          `${API_BASE}/api/v2/user/${userId}/profile`
        );
        setProfile(data);

        // Fetch user profile info (username, avatar, and goal)
        const profileInfo = await apiFetch<UserProfileResponse>(
          `${API_BASE}/api/v2/user/${userId}/profile-info`
        );
        setUsername(profileInfo.username);
        setAvatar(profileInfo.avatar);
        setDraftName(profileInfo.username);
        setGoalText(profileInfo.goal_text || null);
        setGoalCreatedAt(profileInfo.goal_created_at || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-slate-500">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-red-500">Error: {error || 'Failed to load profile'}</div>
      </div>
    );
  }

  // Calculate progress percentage for level
  const totalXpForCurrentLevel = profile.next_level_xp - (profile.next_level_xp - profile.total_xp - profile.xp_for_next_level);
  const xpInCurrentLevel = profile.total_xp - totalXpForCurrentLevel;
  const xpNeededForLevel = profile.next_level_xp - totalXpForCurrentLevel;
  const progressPercentage = xpNeededForLevel > 0 ? (xpInCurrentLevel / xpNeededForLevel) * 100 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="mb-8 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Your Profile
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Polish Learning Progress</h1>
        </motion.div>

        {/* Avatar + Username Section */}
        <div className="flex flex-col items-center mb-6">
          {/* Avatar */}
          <div className="relative">
            {/* Radial glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="absolute inset-0 bg-gradient-radial from-slate-200 to-transparent rounded-full blur-xl opacity-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAvatarPicker(true)}
              className="relative w-20 h-20 flex items-center justify-center rounded-full bg-slate-200 shadow-md text-5xl cursor-pointer transition-shadow group"
            >
              {avatar}
              {/* Hover tooltip with fade-in */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100"
              >
                Click to change avatar
              </motion.div>
            </motion.div>
          </div>

          {/* Username */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 flex items-center gap-2"
          >
            {!editing ? (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <h2 className="text-2xl font-bold text-slate-800">{username}</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleEditClick}
                  className="ml-2 text-slate-500 hover:text-slate-700 transition"
                  aria-label="Edit username"
                >
                  ✏️
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="text-xl px-3 py-1.5 max-w-[240px] rounded-xl border-2 border-blue-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveClick();
                    if (e.key === 'Escape') handleCancelClick();
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="text-green-600 hover:text-green-700 transition text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Save"
                >
                  {saving ? '⏳' : '✔️'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleCancelClick}
                  className="text-red-600 hover:text-red-700 transition text-xl"
                  aria-label="Cancel"
                >
                  ✖️
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-4xl font-bold text-slate-900">Level {profile.level}</p>
              <p className="text-sm text-slate-500 mt-1">
                {profile.xp_for_next_level > 0
                  ? `${profile.xp_for_next_level} XP to next level`
                  : 'Max level reached!'}
              </p>
            </div>
            <div className="text-5xl">🏆</div>
          </div>

          {/* Progress Bar */}
          {profile.xp_for_next_level > 0 && (
            <div className="relative">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-amber-500"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 text-center">
                {profile.total_xp} / {profile.next_level_xp} XP
              </p>
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Total XP Card */}
          <motion.div
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-[2px] shadow-md"
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Total XP
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-950">
                    {profile.total_xp.toLocaleString()}
                  </p>
                </div>
                <div className="text-4xl">⚡</div>
              </div>
            </div>
          </motion.div>

          {/* Total Sessions Card */}
          <motion.div
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="relative rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-[2px] shadow-md"
          >
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    Sessions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {profile.total_sessions}
                  </p>
                </div>
                <div className="text-4xl">📘</div>
              </div>
            </div>
          </motion.div>

          {/* Current Streak Card */}
          <motion.div
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="relative rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-[2px] shadow-md sm:col-span-2 lg:col-span-1"
          >
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Current Streak
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {profile.current_streak} <span className="text-xl">days</span>
                  </p>
                </div>
                <div className="text-4xl">🔥</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Best Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Top Achievements</h2>

          {profile.best_badges.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-4xl">🏅</p>
              <p className="mt-4 text-slate-600">No badges unlocked yet.</p>
              <p className="mt-2 text-sm text-slate-400">
                Keep practicing to earn your first achievement!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {profile.best_badges.map((badge, index) => (
                <motion.div
                  key={badge.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.4 + index * 0.1,
                    ease: 'easeOut',
                  }}
                  className="group relative rounded-2xl bg-white p-3.5 text-center shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <span className="text-4xl">{badge.icon || '🏅'}</span>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">{badge.name}</p>
                  
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                    {badge.name}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Learning Goal Section */}
        <GoalCard
          goalText={goalText}
          goalCreatedAt={goalCreatedAt}
          onEditGoal={handleEditGoal}
          onClearGoal={handleClearGoal}
          profileStats={profile}
          username={username}
        />

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          onClick={() => navigate('/')}
          className="w-full rounded-2xl bg-slate-800 py-[18px] font-medium text-white shadow-lg outline outline-1 outline-white/10 transition-all hover:bg-slate-700"
        >
          Back to Home
        </motion.button>
      </div>

      {/* Emoji Picker Modal */}
      {showAvatarPicker && (
        <EmojiPickerModal
          onSelect={(emoji) => {
            setAvatar(emoji);
            setShowAvatarPicker(false);
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}

