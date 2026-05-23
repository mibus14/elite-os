import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        elite: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#FF6B6B',
          600: 'rgb(var(--accent-rgb) / <alpha-value>)',
          700: '#B91C1C',
          800: '#991b1b',
          900: '#7f1d1d',
          neon: '#FF003C',
          gold: '#FFD700',
        },
        dark: {
          50:  '#666666',
          100: '#A0A0A0',
          200: '#333333',
          300: '#2A2A2A',
          400: '#1A1A1A',
          500: '#141414',
          600: '#111111',
          700: '#0D0D0D',
          800: '#0A0A0A',
          900: '#050505',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        'space-grotesk': ['Space Grotesk', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red':  '0 0 20px rgba(220, 20, 60, 0.4), 0 0 40px rgba(220, 20, 60, 0.2)',
        'glow-red-sm': '0 0 10px rgba(220, 20, 60, 0.3)',
        'glow-red-lg': '0 0 40px rgba(220, 20, 60, 0.5), 0 0 80px rgba(220, 20, 60, 0.25)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
        'glow-gold-sm': '0 0 10px rgba(255, 215, 0, 0.3)',
        'card':      '0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.3)',
        'card-hover':'0 8px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(220, 20, 60, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-elite': 'linear-gradient(135deg, #DC143C 0%, #FF003C 50%, #B91C1C 100%)',
        'gradient-dark':  'linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0A0A0A 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'slide-up':    'slideUp 0.5s ease-out forwards',
        'fade-in':     'fadeIn 0.4s ease-out forwards',
        'spin-slow':   'spin 8s linear infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'gradient-x':  'gradientX 6s ease infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(220, 20, 60, 0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(220, 20, 60, 0.6), 0 0 80px rgba(220, 20, 60, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
    },
  },
  plugins: [],
}

export default config
