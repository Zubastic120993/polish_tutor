import { forwardRef } from "react";
import { motion } from "framer-motion";

export interface ShareWeeklySummaryCardProps {
  weekStart: string;        // e.g. "2025-11-17"
  weekEnd: string;          // e.g. "2025-11-23"
  totalXp: number;
  daysPracticed: number;    // 0–7
  bestBadge?: {
    code: string;
    name: string;
    icon: string;
  } | null;
  streak: number;           // weekly or overall streak
}

// Format date range for header (e.g., "Nov 17 → Nov 23")
function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startFormatted = start.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric" 
  });
  const endFormatted = end.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric" 
  });
  
  return `${startFormatted} → ${endFormatted}`;
}

// Floating particles animation variants
const particleVariants = {
  initial: { opacity: 0, scale: 0 },
  animate: (i: number) => ({
    opacity: [0, 0.6, 0],
    scale: [0, 1, 0.8],
    x: [0, Math.random() * 40 - 20],
    y: [0, -Math.random() * 80 - 40],
    transition: {
      duration: 2.5,
      delay: i * 0.2,
      repeat: Infinity,
      repeatDelay: 1.5,
      ease: "easeOut",
    },
  }),
};

// Icon bounce animation
const iconBounceVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      duration: 0.8,
      bounce: 0.5,
    },
  },
};

export const ShareWeeklySummaryCard = forwardRef<HTMLDivElement, ShareWeeklySummaryCardProps>(
  ({ weekStart, weekEnd, totalXp, daysPracticed, bestBadge, streak }, ref) => {
    const weekRange = formatWeekRange(weekStart, weekEnd);

    return (
      <div
        ref={ref}
        className="w-[900px] mx-auto relative overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5b4b8a 100%)",
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
              "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)",
          }}
        />

        {/* Decorative corner accents */}
        <div
          className="absolute top-0 right-0 w-96 h-96 opacity-20"
          style={{
            background:
              "radial-gradient(circle at top right, #a78bfa 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 opacity-20"
          style={{
            background:
              "radial-gradient(circle at bottom left, #60a5fa 0%, transparent 70%)",
          }}
        />

        {/* Main content */}
        <div className="relative z-10 p-12 flex flex-col">
          {/* Floating particles */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                custom={i}
                variants={particleVariants}
                initial="initial"
                animate="animate"
                className="absolute w-2 h-2 rounded-full bg-white/70"
                style={{
                  left: `${(i - 2) * 35}px`,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1
              className="text-5xl font-extrabold text-white mb-3 drop-shadow-lg"
              style={{
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              My Polish Learning Week
            </h1>
            <p className="text-xl text-white/80 font-medium tracking-wide">
              {weekRange}
            </p>
          </motion.div>

          {/* XP Bar - Big Number */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 text-center"
          >
            <div className="inline-block relative">
              {/* Glow behind text */}
              <div
                className="absolute inset-0 blur-3xl opacity-40"
                style={{
                  backgroundColor: "#fbbf24",
                  transform: "scale(1.5)",
                }}
              />
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl px-10 py-6 border border-white/20">
                <p className="text-6xl font-extrabold text-white drop-shadow-2xl">
                  ✨ {totalXp.toLocaleString()} XP
                </p>
                <p className="text-lg text-white/70 mt-2 font-medium">
                  earned this week
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-2 gap-6 mb-8"
          >
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-6 text-center shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-2">
                Days Practiced
              </p>
              <p className="text-5xl font-extrabold text-white drop-shadow-lg">
                {daysPracticed}/7
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-6 text-center shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-2">
                Current Streak
              </p>
              <p className="text-5xl font-extrabold text-white drop-shadow-lg">
                {streak} 🔥
              </p>
            </div>
          </motion.div>

          {/* Best Badge Section */}
          {bestBadge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-8 text-center mb-8"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4">
                Best Achievement This Week
              </p>

              <motion.div
                variants={iconBounceVariants}
                initial="initial"
                animate="animate"
                className="relative inline-block mb-4"
              >
                {/* Glow behind icon */}
                <div
                  className="absolute inset-0 blur-3xl opacity-50"
                  style={{
                    backgroundColor: "#fbbf24",
                    transform: "scale(1.8)",
                  }}
                />
                <div className="relative text-[100px] leading-none drop-shadow-2xl">
                  {bestBadge.icon}
                </div>
              </motion.div>

              <p className="text-2xl font-bold text-white drop-shadow-lg">
                {bestBadge.name}
              </p>
            </motion.div>
          )}

          {/* No badge fallback */}
          {!bestBadge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-8 text-center mb-8"
            >
              <p className="text-lg text-white/70 font-medium">
                Keep practicing to unlock your first badge this week! 🎯
              </p>
            </motion.div>
          )}

          {/* Watermark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center text-xs text-white/50 font-semibold tracking-wider"
          >
            Polish Tutor • AI Powered
          </motion.div>
        </div>
      </div>
    );
  }
);

ShareWeeklySummaryCard.displayName = "ShareWeeklySummaryCard";

