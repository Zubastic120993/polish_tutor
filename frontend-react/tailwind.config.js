/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        achievement: {
          orange: '#f97316',
          green: '#22c55e',
          blue: '#3b82f6',
          yellow: '#eab308',
          red: '#ef4444',
        },
      },
      dropShadow: {
        flame: '0 0 10px rgba(251, 191, 36, 0.5)',
        'flame-perfect': '0 0 20px rgba(249, 115, 22, 0.7)',
        'flame-error': '0 0 15px rgba(239, 68, 68, 0.6)',
      },
      keyframes: {
        bannerSlideIn: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bannerSlideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' },
        },
        bannerSparkle: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1.5) rotate(180deg)', opacity: '0' },
        },
        flameIdle: {
          '0%, 100%': { transform: 'scale(1) translateY(0)', opacity: '0.9' },
          '50%': { transform: 'scale(1.05) translateY(-2px)', opacity: '1' },
        },
        glowIdle: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.6' },
        },
        flameBoost: {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.5)', filter: 'brightness(1.5)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        streakNumberPulse: {
          '0%': { transform: 'scale(1)', textShadow: '0 0 0px rgba(251, 191, 36, 0)' },
          '50%': { transform: 'scale(1.3)', textShadow: '0 0 20px rgba(251, 191, 36, 0.8)' },
          '100%': { transform: 'scale(1)', textShadow: '0 0 0px rgba(251, 191, 36, 0)' },
        },
        sparkRise: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-40px) scale(0.5)', opacity: '0' },
        },
        emberDrift: {
          '0%': { transform: 'translate(0, 0)', opacity: '0.6' },
          '100%': { transform: 'translate(var(--drift-x), -60px)', opacity: '0' },
        },
        superFlicker: {
          '0%, 100%': { transform: 'scale(1.1) translateY(-3px)', opacity: '1' },
          '25%': { transform: 'scale(1.15) translateY(-5px)', opacity: '0.95' },
          '50%': { transform: 'scale(1.12) translateY(-4px)', opacity: '1' },
          '75%': { transform: 'scale(1.13) translateY(-6px)', opacity: '0.98' },
        },
        flameCollapse: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.3) translateY(10px)', opacity: '0' },
        },
        errorFlashRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        flameSleep: {
          '0%, 100%': { transform: 'scale(0.8)', opacity: '0.4' },
          '50%': { transform: 'scale(0.85)', opacity: '0.5' },
        },
        streakDim: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
        xpFloat: {
          '0%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-20px)' },
        },
        modalFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalScaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        cefrRingGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.8)' },
        },
        xpBurstPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        goalFillProgress: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        goalCompleteGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px rgba(34, 197, 94, 0.5))' },
          '50%': { filter: 'drop-shadow(0 0 15px rgba(34, 197, 94, 0.9))' },
        },
        goalCheckmark: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
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
        'flame-idle': 'flameIdle 2s ease-in-out infinite',
        'glow-idle': 'glowIdle 2s ease-in-out infinite',
        'flame-boost': 'flameBoost 0.4s ease-out',
        'streak-pulse': 'streakNumberPulse 0.4s ease-out',
        'spark-rise': 'sparkRise 0.6s ease-out forwards',
        'ember-drift': 'emberDrift 3s ease-out forwards',
        'super-flicker': 'superFlicker 1s ease-in-out infinite',
        'flame-collapse': 'flameCollapse 0.3s ease-in forwards',
        'error-flash': 'errorFlashRed 0.4s ease-in-out',
        shake: 'shake 0.3s ease-in-out',
        'flame-sleep': 'flameSleep 3s ease-in-out infinite',
        'streak-dim': 'streakDim 0.5s ease-out forwards',
        xpFloat: 'xpFloat 1.5s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        ringShimmer: 'ringShimmer 1.6s ease-in-out infinite',
        confettiBurst: 'confettiBurst 0.65s ease-out forwards',
        confettiDriftLeft: 'confettiDriftLeft 0.65s ease-out forwards',
        confettiDriftRight: 'confettiDriftRight 0.65s ease-out forwards',
        'banner-slide-in': 'bannerSlideIn 0.4s ease-out',
        'banner-slide-out': 'bannerSlideOut 0.4s ease-in forwards',
        'banner-sparkle': 'bannerSparkle 0.8s ease-out forwards',
        'modal-fade-in': 'modalFadeIn 0.3s ease-out forwards',
        'modal-scale-in': 'modalScaleIn 0.4s ease-out forwards',
        'cefr-ring-glow': 'cefrRingGlow 2s ease-in-out infinite',
        'xp-burst-pulse': 'xpBurstPulse 0.6s ease-in-out',
        'goal-fill': 'goalFillProgress 0.8s ease-out forwards',
        'goal-complete-glow': 'goalCompleteGlow 1.5s ease-in-out infinite',
        'goal-checkmark': 'goalCheckmark 0.5s ease-out forwards',
        successGlow: 'successGlow 0.45s ease-out forwards',
        cardIn: 'cardIn 0.18s ease-out both',
        flashHighlight: 'flashHighlight 0.3s ease-out forwards',
        xpPulse: 'xpPulse 0.8s ease-out',
      },
    },
  },
  plugins: [],
}
