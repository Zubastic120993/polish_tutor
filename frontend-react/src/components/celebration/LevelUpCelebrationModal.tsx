import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CelebrationParticles } from "./CelebrationParticles";

interface BadgeItem {
  code: string;
  name: string;
  icon: string;
}

interface LevelUpCelebrationModalProps {
  visible: boolean;
  level: number;
  xpGained: number;
  newBadges?: BadgeItem[];
  onClose: () => void;
}

export function LevelUpCelebrationModal({
  visible,
  level,
  xpGained,
  newBadges = [],
  onClose,
}: LevelUpCelebrationModalProps) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.15), rgba(0,0,0,0.75))",
          }}
        >
          {/* Confetti / Particles */}
          <CelebrationParticles />

          {/* Sparkle Burst Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(14)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.4, 0.6],
                  opacity: [0, 0.9, 0],
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                }}
                transition={{
                  duration: 1.8,
                  delay: 0.15 + Math.random() * 0.2,
                }}
                className="absolute bg-yellow-300 rounded-full blur-md"
                style={{
                  width: 18 + Math.random() * 26,
                  height: 18 + Math.random() * 26,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.15, 1],
              opacity: 1,
              boxShadow: [
                "0 0 0px rgba(255,215,0,0)",
                "0 0 60px rgba(255,215,0,0.35)",
                "0 0 22px rgba(0,0,0,0.25)",
              ],
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center"
          >
            {/* Level icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{
                scale: [0, 1.35, 1],
                rotate: [-8, 8, -4, 0],
              }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-7xl mb-4"
            >
              🥳
            </motion.div>

            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
              Level Up!
            </h1>

            <p className="text-xl text-slate-700 mb-6">
              You reached <span className="font-bold">Level {level}</span>!
            </p>

            {/* XP counter with spring effect */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: [1, 1.25, 1],
              }}
              transition={{
                delay: 0.22,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className="text-3xl font-extrabold text-amber-600 mb-6 drop-shadow"
            >
              +{xpGained} XP
            </motion.p>

            {/* New Badges */}
            {newBadges.length > 0 && (
              <div className="mb-6">
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  New Badges:
                </p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {newBadges.map((b) => (
                    <motion.div
                      key={b.code}
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{
                        scale: [0, 1.4, 1],
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: 0.35 + Math.random() * 0.15,
                      }}
                      className="text-center"
                    >
                      <div className="text-4xl">{b.icon}</div>
                      <p className="mt-1 text-sm text-slate-600 font-medium">
                        {b.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-xl text-lg font-medium shadow-lg hover:bg-slate-800"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

