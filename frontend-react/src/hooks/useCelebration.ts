import { useState, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";

interface ProfileData {
  level: number;
  total_xp: number;
}

interface BadgeHistoryItem {
  code: string;
  name: string;
  icon: string;
  unlocked_at: string;
}

export function useCelebration(userId = 1) {
  const [toastVisible, setToastVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<BadgeHistoryItem[]>([]);

  const fetchProfile = async (): Promise<ProfileData> => {
    return apiFetch(`/api/v2/user/${userId}/profile-info`);
  };

  const fetchBadgeHistory = async (): Promise<BadgeHistoryItem[]> => {
    return apiFetch(`/api/v2/user/${userId}/badge-history`);
  };

  /**
   * Call after finishing a session:
   * triggerCelebration({ previousProfile })
   */
  const triggerCelebration = useCallback(
    async (previous: ProfileData) => {
      const after = await fetchProfile();

      const xpDelta = after.total_xp - previous.total_xp;
      const levelIncreased = after.level > previous.level;

      setXpGained(xpDelta > 0 ? xpDelta : 0);

      if (xpDelta > 0) {
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2500);
      }

      if (!levelIncreased) return;

      // Level up celebration
      setLevel(after.level);

      // Detect newly unlocked badges
      const beforeList = await fetchBadgeHistory();
      const beforeCodes = new Set(beforeList.map((b) => b.code));

      const afterList = await fetchBadgeHistory();
      const newOnes = afterList.filter((b) => !beforeCodes.has(b.code));

      setNewBadges(newOnes);
      setModalVisible(true);
    },
    [userId]
  );

  return {
    // state
    toastVisible,
    modalVisible,
    xpGained,
    newBadges,
    level,

    // actions
    closeModal: () => setModalVisible(false),
    triggerCelebration,

    // helper: call this before session start
    fetchProfile,
  };
}

