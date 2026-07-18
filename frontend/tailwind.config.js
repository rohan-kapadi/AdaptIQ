/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#F5A623',
          500: '#E6951F',
          600: '#D4851A',
        },
        teal: {
          skill: '#00E5A0',
        },
        danger: '#FF4D6D',
        surface: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          hover: 'rgba(255,255,255,0.08)',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'gradient-x': 'gradientX 4s ease infinite',
        'typewriter': 'typewriter 0.5s steps(10) forwards',
        'blink': 'blink 1s step-end infinite',
        'progress-bar': 'progressBar 2s ease-out forwards',
        'ring-fill': 'ringFill 1.5s ease-out forwards',
        'bar-grow': 'barGrow 1s ease-out forwards',
        'count-up': 'countUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 166, 35, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 166, 35, 0.9), 0 0 60px rgba(245, 166, 35, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        progressBar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        ringFill: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--target-offset)' },
        },
        barGrow: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(120,40,200,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(245,166,35,0.15) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(0,229,160,0.1) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}


