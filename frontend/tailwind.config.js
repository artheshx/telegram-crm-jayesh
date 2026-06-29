/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#111118',
          tertiary: '#16161f',
          elevated: '#1c1c28',
        },
        border: {
          subtle: '#1e1e2e',
          default: '#252538',
          strong: '#2e2e45',
        },
        accent: {
          blue: '#4f6ef7',
          'blue-dim': '#2d3d8a',
          purple: '#7c5af0',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#f59e0b',
          cyan: '#06b6d4',
        },
        text: {
          primary: '#e8e8f0',
          secondary: '#9090a8',
          muted: '#5c5c78',
          inverse: '#0a0a0f',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        elevated: '0 4px 16px rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(79,110,247,0.15)',
      },
    },
  },
  plugins: [],
}
