/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./static/**/*.{html,js}",
    "./templates/**/*.{html,js}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'var(--font-body)', 'system-ui'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        "cafe-foam": "#F6EDE3",
        "cafe-cream": "#FCF5EC",
        "cafe-hazelnut": "#E6C7A5",
        "cafe-espresso": "#43281C",
        "cafe-green": "#5BA38F",
        "cafe-rose": "#F6C5B1",
        "cafe-mocha": "#5C3317",
      },
      boxShadow: {
        "cafe-card": "0 45px 120px rgba(92, 51, 23, 0.18)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
};
