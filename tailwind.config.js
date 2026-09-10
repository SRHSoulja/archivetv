/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        retro: ['"VT323"', 'monospace'],
        vcr: ['"VT323"', '"Courier New"', 'monospace'],
        pixel: ['"Silkscreen"', 'monospace'],
        mono: ['"Share Tech Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        wood: {
          900: '#1b0f07',
          800: '#2c180b',
          700: '#432613',
          600: '#5a341b',
          500: '#734324',
          400: '#8e5531',
        },
        crt: {
          black: '#0a0a0c',
          bezel: '#1f1e24',
          frame: '#141418',
          screen: '#050706',
          green: '#33ff33',
          amber: '#ffb000',
          blue: '#2df5ff',
          red: '#ff3344',
        }
      },
      boxShadow: {
        'crt-inner': 'inset 0 0 100px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 0, 0, 0.8)',
        'crt-glow': '0 0 60px rgba(45, 245, 255, 0.15)',
        'wood-cabinet': '0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 18px 36px -18px rgba(0, 0, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.15), inset 0 -4px 8px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        flicker: {
          '0%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.98' },
        }
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
}
