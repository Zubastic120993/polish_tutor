import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoalModal } from './GoalModal';
import { GoalSuggestionsModal } from './GoalSuggestionsModal';
import type { ProfileResponse } from '../../types/profile';
import { formatLongDate } from './helpers/date';

interface GoalCardProps {
  goalText: string | null;
  goalCreatedAt: string | null;
  onEditGoal: (text: string) => void;
  onClearGoal: () => void;
  profileStats?: ProfileResponse;
  username?: string;
}

export function GoalCard({ goalText, goalCreatedAt, onEditGoal, onClearGoal, profileStats, username }: GoalCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSaveGoal = (text: string) => {
    onEditGoal(text);
    setShowModal(false);
    setJustSaved(true);
  };

  useEffect(() => {
    if (justSaved) {
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justSaved]);

  const handleClearGoal = () => {
    if (confirm('Are you sure you want to clear your goal?')) {
      onClearGoal();
    }
  };

  const handleEditGoal = () => {
    setShowModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.65 }}
        className="mb-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h2 className="text-lg font-semibold text-slate-800">Your Learning Goal</h2>
        </div>

        <AnimatePresence mode="wait">
          {!goalText ? (
            // No goal set - show prompt
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center shadow-sm"
            >
              <p className="text-4xl">🎯</p>
              <p className="mt-3 text-slate-600">
                You don't have a goal yet. Set one to stay motivated!
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-amber-600 hover:shadow-lg"
                >
                  Set Goal
                </motion.button>
                {profileStats && username && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowSuggestionsModal(true)}
                    className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-600 hover:shadow-lg"
                  >
                    ✨ Suggest a Goal
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            // Goal exists - show card
            <motion.div
              key="goal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={justSaved ? {
                opacity: 1,
                scale: [1, 1.02, 1],
                boxShadow: [
                  "0 1px 3px rgba(0,0,0,0.1)",
                  "0 0 0 4px rgba(245, 158, 11, 0.2), 0 4px 6px rgba(0,0,0,0.1)",
                  "0 1px 3px rgba(0,0,0,0.1)"
                ]
              } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md"
            >
              {/* Success checkmark */}
              <AnimatePresence>
                {justSaved && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    ✓
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900">{goalText}</p>
                  {goalCreatedAt && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span>📅</span>
                      <span>Set on {formatLongDate(goalCreatedAt)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleEditGoal}
                  className="flex-1 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 hover:shadow-lg"
                >
                  ✏️ Edit Goal
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleClearGoal}
                  className="flex-1 rounded-xl bg-red-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 hover:shadow-lg"
                >
                  🗑️ Clear Goal
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Goal Modal */}
      {showModal && (
        <GoalModal
          initialGoal={goalText || ''}
          onSave={handleSaveGoal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* AI Suggestions Modal */}
      {showSuggestionsModal && profileStats && username && (
        <GoalSuggestionsModal
          profileStats={profileStats}
          username={username}
          currentGoal={goalText}
          onSelectSuggestion={handleSaveGoal}
          onClose={() => setShowSuggestionsModal(false)}
        />
      )}
    </>
  );
}

