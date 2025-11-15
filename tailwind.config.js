/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/templates/**/*.{html,js}",
    "./frontend/static/**/*.{html,js}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Poppins"', 'var(--font-body)', 'system-ui'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        // Modern color palette - Blue 600 & Emerald 500
        "app-bg": "#f8fafc",
        "app-surface": "#ffffff",
        "app-text": "#0f172a",
        "app-text-muted": "#64748b",
        "app-accent": "#2563eb",
        "app-accent-hover": "#1d4ed8",
        "app-success": "#10b981",
        "app-warning": "#f59e0b",
        "app-error": "#ef4444",
        "app-info": "#3b82f6",
        // Legacy cafe colors (for backward compatibility)
        "cafe-foam": "#f8fafc",
        "cafe-cream": "#ffffff",
        "cafe-hazelnut": "#e2e8f0",
        "cafe-espresso": "#0f172a",
        "cafe-green": "#10b981",
        "cafe-rose": "#f59e0b",
        "cafe-mocha": "#64748b",
        // Polish colors
        "polish-red": "#ef4444",
        "polish-blue": "#2563eb",
      },
      borderRadius: {
        "modern": "12px",
      },
      boxShadow: {
        "cafe-card": "0 45px 120px rgba(92, 51, 23, 0.18)",
        "modern-md": "0 4px 6px rgba(0, 0, 0, 0.05)",
        "modern-lg": "0 10px 25px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
};
