/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      dropShadow: {
        flame: '0 0 12px rgba(249, 115, 22, 0.45)',
      },
      keyframes: {
        xpFloat: {
          '0%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: '200px 0' },
        },
        ringShimmer: {
          '0%': { opacity: 0.4 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.4 },
        },
        confettiBurst: {
          '0%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-90px)' },
        },
        confettiDriftLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-30px)' },
        },
        confettiDriftRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(30px)' },
        },
        successGlow: {
          '0%': { boxShadow: '0 0 0 rgba(74, 222, 128, 0)' },
          '60%': { boxShadow: '0 0 30px rgba(74, 222, 128, 0.45)' },
          '100%': { boxShadow: '0 0 0 rgba(74, 222, 128, 0)' },
        },
        shake: {
          '0%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-3px)' },
          '40%': { transform: 'translateX(3px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
          '100%': { transform: 'translateX(0)' },
        },
        cardIn: {
          '0%': { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        flashHighlight: {
          '0%': { opacity: 0.45 },
          '100%': { opacity: 0 },
        },
        xpPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.45)' },
          '60%': { boxShadow: '0 0 18px 8px rgba(251, 191, 36, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
        },
      },
      animation: {
        xpFloat: 'xpFloat 1.5s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        ringShimmer: 'ringShimmer 1.6s ease-in-out infinite',
        confettiBurst: 'confettiBurst 0.65s ease-out forwards',
        confettiDriftLeft: 'confettiDriftLeft 0.65s ease-out forwards',
        confettiDriftRight: 'confettiDriftRight 0.65s ease-out forwards',
        successGlow: 'successGlow 0.45s ease-out forwards',
        shake: 'shake 0.4s ease-in-out',
        cardIn: 'cardIn 0.18s ease-out both',
        flashHighlight: 'flashHighlight 0.3s ease-out forwards',
        xpPulse: 'xpPulse 0.8s ease-out',
      },
    },
  },
  plugins: [],
}
