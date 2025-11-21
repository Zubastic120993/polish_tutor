import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XpGainToastProps {
  visible: boolean;
  xp: number;
  onClose: () => void;
}

export function XpGainToast({ visible, xp, onClose }: XpGainToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: [0.9, 1.1, 1],
            boxShadow: [
              "0 0 0px rgba(255,193,7,0)",
              "0 0 26px rgba(255,193,7,0.35)",
              "0 0 4px rgba(0,0,0,0.25)",
            ],
          }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="fixed bottom-6 right-6 z-[200] rounded-xl bg-amber-500 text-white px-5 py-3 font-semibold shadow-xl flex items-center gap-2 text-lg"
        >
          <span className="text-2xl">⚡</span>
          {/* XP spring counter */}
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.25, 1] }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            +{xp} XP
          </motion.span>

          {/* Micro Confetti Burst */}
          <div className="absolute -top-3 -right-3 pointer-events-none">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.4, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180],
              }}
              transition={{
                duration: 0.9,
                ease: "easeOut",
              }}
              className="w-4 h-4 bg-yellow-300 rounded-full shadow"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

