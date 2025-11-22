import { motion } from "framer-motion";

interface GreetingCardProps {
  username?: string;
}

function getTimeBasedGreeting(username?: string) {
  const hour = new Date().getHours();
  const name = username ? `, ${username}` : "";

  if (hour >= 5 && hour < 12) return `🌅 Good morning${name}!`;
  if (hour >= 12 && hour < 17) return `☀️ Good afternoon${name}!`;
  return `🌙 Good evening${name}!`;
}

export function GreetingCard({ username }: GreetingCardProps) {
  const greeting = getTimeBasedGreeting(username);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-3xl bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]
                 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 cursor-pointer
                 transition-all duration-300 ease-out
                 hover:shadow-md active:scale-[0.98]
                 focus-within:ring-2 focus-within:ring-amber-400 touch-target"
    >
      {/* Time-based subtle gradient highlight - consistent pattern */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.28] sm:opacity-[0.4]"
        style={{
          background: (() => {
            const hour = new Date().getHours()
            if (hour >= 5 && hour < 12) {
              return "linear-gradient(to bottom, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.05), transparent 60%)"
            }
            if (hour >= 12 && hour < 17) {
              return "linear-gradient(to bottom, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.04), transparent 60%)"
            }
            return "linear-gradient(to bottom, rgba(129, 140, 248, 0.09), rgba(129, 140, 248, 0.04), transparent 60%)"
          })()
        }}
      />
      
      <p className="text-xl sm:text-2xl font-bold text-slate-900 relative z-10">{greeting}</p>
      <p className="mt-1 text-slate-600 relative z-10">
        Ready to continue your learning journey?
      </p>
    </motion.div>
  );
}

