/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bitcoin DeFi Palette
        void: '#030304',
        surface: '#0F1115',
        muted: '#94A3B8',
        border: '#1E293B',
        bitcoin: '#F7931A',
        'bitcoin-dark': '#EA580C',
        gold: '#FFD600',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 10s linear infinite',
        'spin-reverse': 'spin 15s linear infinite reverse',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'glow-orange': '0 0 20px -5px rgba(234, 88, 12, 0.5)',
        'glow-orange-lg': '0 0 30px -5px rgba(247, 147, 26, 0.6)',
        'glow-gold': '0 0 20px rgba(255, 214, 0, 0.3)',
        'card-hover': '0 0 30px -10px rgba(247, 147, 26, 0.2)',
      },
    },
  },
  plugins: [],
};
