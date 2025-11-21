import { motion } from "framer-motion";

interface CelebrationParticlesProps {
  count?: number;
  size?: number;
  opacity?: number;
}

export function CelebrationParticles({
  count = 26,
  size = 14,
  opacity = 0.25,
}: CelebrationParticlesProps) {
  const particles = Array.from({ length: count });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity,
            scale: 0,
            // More explosive randomized spawn
            filter: "blur(0px)",
            rotate: Math.random() * 180,
            x: Math.random() * 800 - 400,
            y: Math.random() * 600 - 300,
          }}
          animate={{
            opacity: [opacity, opacity * 0.7, opacity],
            scale: [0, 1.3, 0],
            rotate: [0, 360 + Math.random() * 360],
            // Sparkle-like flicker
            filter: [
              "brightness(0.9)",
              "brightness(1.4)",
              "brightness(1)",
              "brightness(1.6)",
              "brightness(1)",
            ],
          }}
          transition={{
            duration: 1.6 + Math.random() * 1.5,
            delay: Math.random() * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full shadow"
          style={{
            width: size * (0.6 + Math.random() * 1.4),
            height: size * (0.6 + Math.random() * 1.4),
            background:
              Math.random() > 0.5
                ? "white"
                : ["#fcd34d", "#a78bfa", "#60a5fa", "#f472b6"][
                    Math.floor(Math.random() * 4)
                  ],
            borderRadius: Math.random() > 0.5 ? "50%" : "30%",
          }}
        />
      ))}
    </div>
  );
}

