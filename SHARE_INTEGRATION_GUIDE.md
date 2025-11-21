# Share Achievement Integration Guide

This guide shows how to add "Share" buttons to existing components to enable users to export their achievements.

---

## 1. Badge Gallery Page Integration

### Location
`frontend-react/src/pages/BadgeGalleryPage.tsx`

### Add Share Button to Each Badge Card

**Find the badge card rendering section and add:**

```tsx
{badge.unlocked && (
  <button
    onClick={() => navigate(`/share/achievement/${badge.code}`)}
    className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
  >
    📤 Share Achievement
  </button>
)}
```

**Full Example:**
```tsx
<div className="rounded-xl bg-white p-6 shadow-sm">
  <div className="text-5xl mb-3 text-center">
    {badge.icon || '🏅'}
  </div>
  <h3 className="font-bold text-slate-900 text-center mb-2">
    {badge.name}
  </h3>
  <p className="text-sm text-slate-600 text-center mb-4">
    {badge.description}
  </p>
  
  {badge.unlocked ? (
    <>
      <p className="text-xs text-emerald-600 text-center mb-2">
        ✓ Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
      </p>
      <button
        onClick={() => navigate(`/share/achievement/${badge.code}`)}
        className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
      >
        📤 Share
      </button>
    </>
  ) : (
    <p className="text-xs text-slate-400 text-center">
      🔒 Locked
    </p>
  )}
</div>
```

---

## 2. Badge History Page Integration

### Location
`frontend-react/src/pages/BadgeHistoryPage.tsx`

### Add Share Button to Timeline Items

**In the timeline rendering section:**

```tsx
<div className="flex items-start gap-4">
  {/* Icon and details */}
  <div className="flex-1">
    <h3 className="font-bold text-slate-900">{item.name}</h3>
    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
    <p className="text-xs text-slate-500 mt-2">
      {formatDate(item.unlocked_at)}
    </p>
  </div>
  
  {/* Share button */}
  <button
    onClick={() => navigate(`/share/achievement/${item.code}`)}
    className="flex-shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors"
  >
    Share
  </button>
</div>
```

---

## 3. Level Up Celebration Modal

### Location
Create/modify a level up modal component

### Add Share to Level Up Modal

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const navigate = useNavigate();

  const handleShare = () => {
    navigate(`/share/achievement/LEVEL_${level}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"
      >
        <div className="text-8xl mb-4">🏆</div>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Level {level} Unlocked!
        </h2>
        
        <p className="text-slate-600 mb-6">
          Congratulations! You've reached level {level}.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-white font-semibold hover:shadow-lg transition-all"
          >
            🎉 Share Achievement
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-200 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-300 transition-colors"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

**Usage:**
```tsx
{showLevelUpModal && (
  <LevelUpModal 
    level={currentLevel} 
    onClose={() => setShowLevelUpModal(false)} 
  />
)}
```

---

## 4. Profile Page Integration

### Location
`frontend-react/src/pages/ProfilePage.tsx`

### Add Share Buttons for Milestones

**Add after the stats grid:**

```tsx
{/* Shareable Milestones */}
<div className="mt-8">
  <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
    🎯 Share Your Progress
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    {/* Share Profile */}
    <button
      onClick={() => navigate('/share/profile')}
      className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white hover:shadow-lg transition-all"
    >
      <div className="text-2xl mb-2">👤</div>
      <div className="font-semibold">Share Profile</div>
    </button>
    
    {/* Share Current Level */}
    <button
      onClick={() => navigate(`/share/achievement/LEVEL_${profile.level}`)}
      className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white hover:shadow-lg transition-all"
    >
      <div className="text-2xl mb-2">🏆</div>
      <div className="font-semibold">Level {profile.level}</div>
    </button>
    
    {/* Share XP Milestone (if reached) */}
    {profile.total_xp >= 5000 && (
      <button
        onClick={() => navigate('/share/achievement/XP_5000')}
        className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white hover:shadow-lg transition-all"
      >
        <div className="text-2xl mb-2">⭐</div>
        <div className="font-semibold">5K XP</div>
      </button>
    )}
    
    {profile.total_xp >= 10000 && (
      <button
        onClick={() => navigate('/share/achievement/XP_10000')}
        className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-4 text-white hover:shadow-lg transition-all"
      >
        <div className="text-2xl mb-2">🌟</div>
        <div className="font-semibold">10K XP</div>
      </button>
    )}
  </div>
</div>
```

---

## 5. Practice Summary Page Integration

### Location
`frontend-react/src/pages/PracticeSummaryPage.tsx`

### Add Share Button After Completing Perfect Day

**Check for Perfect Day badge unlock:**

```tsx
const [showPerfectDayShare, setShowPerfectDayShare] = useState(false);

useEffect(() => {
  // Check if user just unlocked Perfect Day
  const checkPerfectDay = async () => {
    const badges = await apiFetch(`${API_BASE}/api/v2/user/1/badges`);
    const perfectDay = badges.badges.find(b => b.code === 'PERFECT_DAY');
    
    // If unlocked today, show share option
    if (perfectDay) {
      const unlockedDate = new Date(perfectDay.unlocked_at);
      const today = new Date();
      const isToday = unlockedDate.toDateString() === today.toDateString();
      setShowPerfectDayShare(isToday);
    }
  };
  
  checkPerfectDay();
}, []);

// In the render:
{showPerfectDayShare && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 text-center"
  >
    <div className="text-4xl mb-3">🔥</div>
    <h3 className="text-xl font-bold text-emerald-900 mb-2">
      Perfect Day Unlocked!
    </h3>
    <p className="text-emerald-700 mb-4">
      You completed all your practice goals today!
    </p>
    <button
      onClick={() => navigate('/share/achievement/PERFECT_DAY')}
      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-white font-semibold transition-colors"
    >
      🎉 Share This Achievement
    </button>
  </motion.div>
)}
```

---

## 6. Weekly Stats Page Integration

### Location
`frontend-react/src/pages/WeeklyStatsPage.tsx`

### Add Share Button to Stats Summary

**At the bottom of stats display:**

```tsx
<div className="mt-8 text-center">
  <button
    onClick={() => navigate('/share/profile')}
    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 text-white font-semibold hover:shadow-xl transition-all"
  >
    <span className="text-xl">📊</span>
    <span>Share Your Weekly Progress</span>
  </button>
</div>
```

---

## 7. Lesson Summary Page Integration

### Location
`frontend-react/src/pages/LessonSummaryPage.tsx`

### Add Share on Level Up

**After lesson completion with level up:**

```tsx
{leveledUp && (
  <div className="mt-6 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-6 text-center border-2 border-amber-200">
    <div className="text-5xl mb-3">🏆</div>
    <h3 className="text-2xl font-bold text-amber-900 mb-2">
      Level Up!
    </h3>
    <p className="text-amber-700 mb-4">
      You reached Level {newLevel}!
    </p>
    <button
      onClick={() => navigate(`/share/achievement/LEVEL_${newLevel}`)}
      className="rounded-lg bg-amber-600 hover:bg-amber-700 px-6 py-3 text-white font-semibold transition-colors"
    >
      Share Your Level Up! 🎉
    </button>
  </div>
)}
```

---

## 8. Navigation Menu Integration

### Add to Main Navigation

**In your navigation component:**

```tsx
<nav className="...">
  <Link to="/profile">Profile</Link>
  <Link to="/badges">Badges</Link>
  <Link to="/badge-history">History</Link>
  
  {/* Dropdown for share options */}
  <div className="relative">
    <button onClick={() => setShowShareMenu(!showShareMenu)}>
      Share 📤
    </button>
    
    {showShareMenu && (
      <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-xl border border-slate-200 py-2">
        <button
          onClick={() => navigate('/share/profile')}
          className="w-full text-left px-4 py-2 hover:bg-slate-50"
        >
          📊 Share Profile
        </button>
        
        <button
          onClick={() => navigate('/badges')}
          className="w-full text-left px-4 py-2 hover:bg-slate-50"
        >
          🏅 Share Badge
        </button>
      </div>
    )}
  </div>
</nav>
```

---

## Common Patterns

### Pattern 1: Inline Share Button
Use for list items and cards:

```tsx
<button
  onClick={() => navigate(`/share/achievement/${code}`)}
  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
>
  Share →
</button>
```

### Pattern 2: Prominent Share Button
Use for major achievements:

```tsx
<button
  onClick={() => navigate(`/share/achievement/${code}`)}
  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
>
  🎉 Share Achievement
</button>
```

### Pattern 3: Icon-Only Share Button
Use for compact layouts:

```tsx
<button
  onClick={() => navigate(`/share/achievement/${code}`)}
  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
  title="Share achievement"
>
  <svg className="w-5 h-5" /* share icon SVG */>
    {/* or use emoji */}
  </svg>
  📤
</button>
```

---

## Helper Functions

### Check if Achievement is Unlocked

```tsx
export async function checkAchievementUnlocked(
  code: string,
  userId: number = 1
): Promise<boolean> {
  try {
    const response = await apiFetch<BadgeHistoryResponse>(
      `${API_BASE}/api/v2/user/${userId}/badge-history`
    );
    return response.history.some(h => h.code === code);
  } catch {
    return false;
  }
}

// Usage:
const canShare = await checkAchievementUnlocked('PERFECT_DAY');
if (canShare) {
  // Show share button
}
```

### Get Available Milestones for Sharing

```tsx
export async function getShareableMilestones(
  userId: number = 1
): Promise<string[]> {
  const profile = await apiFetch<ProfileResponse>(
    `${API_BASE}/api/v2/user/${userId}/profile-info`
  );
  
  const milestones: string[] = [];
  
  // Current level
  milestones.push(`LEVEL_${profile.level}`);
  
  // XP milestones
  if (profile.total_xp >= 1000) milestones.push('XP_1000');
  if (profile.total_xp >= 5000) milestones.push('XP_5000');
  if (profile.total_xp >= 10000) milestones.push('XP_10000');
  
  // Unlocked badges
  const badges = await apiFetch<UserBadgesResponse>(
    `${API_BASE}/api/v2/user/${userId}/badges`
  );
  badges.badges.forEach(b => milestones.push(b.code));
  
  return milestones;
}

// Usage:
const shareable = await getShareableMilestones();
// ['LEVEL_5', 'XP_1000', 'PERFECT_DAY', 'STREAK_7']
```

---

## Best Practices

1. **Only show share for unlocked achievements**
   - Check unlock status before displaying button
   - Disable/hide button for locked items

2. **Use clear CTAs**
   - "Share Achievement" > "Share"
   - "Share Your Progress" > "Export"
   - Include emoji for visual appeal

3. **Provide context**
   - Explain what will be shared
   - Show preview if possible
   - Indicate file format (PNG)

4. **Handle errors gracefully**
   - Invalid codes redirect to /badges
   - Show helpful error messages
   - Don't break user flow

5. **Optimize for mobile**
   - Large tap targets (min 44px)
   - Responsive button sizing
   - Clear labels on small screens

---

## Testing Checklist

- [ ] Share button appears on unlocked badges
- [ ] Share button hidden on locked badges
- [ ] Click share navigates to correct URL
- [ ] Level up modal shows share option
- [ ] Profile page has share milestones section
- [ ] Practice summary shows Perfect Day share
- [ ] Badge history items have share buttons
- [ ] Navigation includes share options
- [ ] Mobile layout works properly
- [ ] All buttons have hover/active states

---

## Summary

The share feature can be integrated throughout the app with minimal code:

1. **Badge Gallery** - Share individual badges
2. **Badge History** - Share from timeline
3. **Level Up Modal** - Celebrate and share
4. **Profile Page** - Share overall progress
5. **Practice Summary** - Share Perfect Day
6. **Weekly Stats** - Share weekly progress
7. **Lesson Summary** - Share level ups
8. **Navigation** - Quick access to share

All share buttons navigate to `/share/achievement/:code` where users can export high-quality PNG images. 🎉

