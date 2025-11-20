import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerModalProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJIS = [
  "🙂", "😁", "😎", "🤓", "🤩", "🥳",
  "🧠", "🔥", "⭐", "🌟", "🚀", "🎯",
  "🐱", "🐶", "🐻", "🐼", "🐸", "🐵",
  "🍀", "🌈", "🌙", "☀️", "⚡", "🎧"
];

export function EmojiPickerModal({ onSelect, onClose }: EmojiPickerModalProps) {
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
          className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Choose Your Avatar</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl text-slate-400 transition hover:text-slate-600"
              aria-label="Close"
            >
              ❌
            </button>
          </div>

          {/* Emoji Grid */}
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((emoji, index) => (
              <motion.button
                key={emoji}
                type="button"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.02,
                  type: 'spring',
                  damping: 15,
                  stiffness: 300
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(emoji)}
                className="flex h-12 w-12 items-center justify-center rounded-full text-3xl transition hover:bg-slate-100"
                aria-label={`Select ${emoji} emoji`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          {/* Footer hint */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Click an emoji to select • Press ESC to cancel
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

