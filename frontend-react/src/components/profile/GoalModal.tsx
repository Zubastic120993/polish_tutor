import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalModalProps {
  initialGoal?: string;
  onSave: (goal: string) => void;
  onClose: () => void;
}

export function GoalModal({ initialGoal = '', onSave, onClose }: GoalModalProps) {
  const [goalText, setGoalText] = useState(initialGoal);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = () => {
    const trimmed = goalText.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {initialGoal ? 'Edit Your Goal' : 'Set Your Learning Goal'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              What do you want to achieve?
            </p>
          </div>

          {/* Input Field */}
          <div className="mb-6">
            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value.slice(0, 120))}
              placeholder='e.g., "Practice Polish 30 min every day" or "Reach Level 5 by December"'
              maxLength={120}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Max 120 characters</span>
              <span>{goalText.length}/120</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleSave}
              disabled={!goalText.trim()}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Goal
            </motion.button>
          </div>

          {/* Footer hint */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Press ESC to cancel
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  // Render to portal
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('modal-root element not found');
    return null;
  }

  return createPortal(modalContent, modalRoot);
}

