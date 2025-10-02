/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mafia: {
          bg: '#0a0a0a', // 깊은 검정 배경
          surface: '#1a1a1a', // 카드/모달
          primary: '#1a1515', // 어두운 적갈색
          secondary: '#2d1f1f', // 보조 표면
          dark: '#0f0f0f', // 더 어두운 배경
          accent: '#dc2626', // 마피아 빨강 (red-600)
          gold: '#fbbf24', // 금색 (호스트 등)
          light: '#e5e5e5', // 밝은 텍스트
          muted: '#9ca3af', // 흐린 텍스트
        },
        dark: {
          bg: '#0a0a0a',
          surface: '#1a1a1a',
          primary: '#1a1515',
          secondary: '#2d1f1f',
        },
        primary: {
          DEFAULT: '#dc2626',
          variant: '#991b1b',
        },
        secondary: {
          DEFAULT: '#fbbf24',
        },
        content: {
          primary: '#e5e5e5',
          secondary: '#9ca3af',
        },
        error: '#dc2626',
      },
      boxShadow: {
        'glow-primary': '0 0 20px 3px rgba(220, 38, 38, 0.3)',
        'glow-secondary': '0 0 15px 2px rgba(251, 191, 36, 0.25)',
        'glow-danger': '0 0 25px 5px rgba(220, 38, 38, 0.5)',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'blood-drip': 'bloodDrip 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px 2px rgba(220, 38, 38, 0.2)' },
          '50%': { boxShadow: '0 0 30px 6px rgba(220, 38, 38, 0.5)' },
        },
        bloodDrip: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(3px)' },
        },
      },
    },
  },
  plugins: [],
}
