import { forwardRef } from "react";
import { motion } from "framer-motion";

export interface AchievementShareProps {
  title: string;         // "Level 5 Unlocked!" / "Perfect Day Badge!" / "50 Sessions!"
  description: string;   // "You reached Level 5. Keep going!" etc.
  icon: string;          // Emoji from badge or level up
  accentColor: string;   // e.g. "#f59e0b"
  bgGradient?: string;   // CSS gradient string
  date: string;          // achievement date (use long-date helper)
}

// Predefined color palettes for achievements
export const ACHIEVEMENT_COLORS = {
  gold: {
    accent: "#f59e0b",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
  },
  blue: {
    accent: "#3b82f6",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)",
  },
  purple: {
    accent: "#a855f7",
    gradient: "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #9333ea 100%)",
  },
  emerald: {
    accent: "#10b981",
    gradient: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
  },
  orange: {
    accent: "#f97316",
    gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
  },
  pink: {
    accent: "#ec4899",
    gradient: "linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)",
  },
};

// Floating particles animation variants
const particleVariants = {
  initial: { opacity: 0, scale: 0 },
  animate: (i: number) => ({
    opacity: [0, 0.6, 0],
    scale: [0, 1, 0.8],
    x: [0, Math.random() * 40 - 20],
    y: [0, -Math.random() * 80 - 40],
    transition: {
      duration: 2,
      delay: i * 0.15,
      repeat: Infinity,
      repeatDelay: 1,
      ease: "easeOut",
    },
  }),
};

export const ShareAchievementCard = forwardRef<HTMLDivElement, AchievementShareProps>(
  ({ title, description, icon, accentColor, bgGradient, date }, ref) => {
    // Use provided gradient or fallback to gold
    const gradient = bgGradient || ACHIEVEMENT_COLORS.gold.gradient;

    return (
      <div
        ref={ref}
        className="w-[900px] mx-auto relative overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: gradient,
        }}
      >
        {/* Noise overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          }}
        />

        {/* Vignette effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.15) 100%)",
          }}
        />

        {/* Main content */}
        <div className="relative z-10 p-16 flex flex-col items-center text-center">
          {/* Floating particles */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                custom={i}
                variants={particleVariants}
                initial="initial"
                animate="animate"
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  left: `${(i - 1.5) * 30}px`,
                }}
              />
            ))}
          </div>

          {/* Icon with glow */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="relative mb-8"
          >
            {/* Glow behind icon */}
            <div
              className="absolute inset-0 blur-3xl opacity-40"
              style={{
                backgroundColor: accentColor,
                transform: "scale(1.5)",
              }}
            />
            <div className="relative text-[120px] leading-none drop-shadow-2xl">
              {icon}
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-extrabold text-white mb-6 drop-shadow-lg"
            style={{
              textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/90 mb-12 max-w-2xl leading-relaxed drop-shadow"
          >
            {description}
          </motion.p>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-white/70 font-medium tracking-wide"
          >
            {date}
          </motion.div>

          {/* Watermark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-xs text-white/50 font-semibold tracking-wider"
          >
            Polish Tutor • AI Powered
          </motion.div>
        </div>

        {/* Decorative corner accents */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-10"
          style={{
            background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 opacity-10"
          style={{
            background: `radial-gradient(circle at bottom left, ${accentColor} 0%, transparent 70%)`,
          }}
        />
      </div>
    );
  }
);

ShareAchievementCard.displayName = "ShareAchievementCard";

