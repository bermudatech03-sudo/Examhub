/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0b0b0b',
          secondary: '#111111',
          card: '#181818',
          hover: '#1f1f1f',
          border: '#2a2a2a'
        },
        accent: {
          DEFAULT: '#ff9900',
          hover: '#ffad33',
          muted: '#ff990033',
          dark: '#cc7a00'
        },
        text: {
          primary: '#ffffff',
          secondary: '#aaaaaa',
          muted: '#666666',
          inverse: '#0b0b0b'
        },
        status: {
          success: '#00cc44',
          error: '#ff3333',
          warning: '#ffcc00',
          info: '#3399ff'
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-orange': 'pulseOrange 2s infinite',
        'spin-slow': 'spin 3s linear infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 153, 0, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255, 153, 0, 0)' }
        }
      }
    }
  },
  plugins: []
}
