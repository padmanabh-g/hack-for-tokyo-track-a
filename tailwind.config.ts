import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#111111',
          surface: '#1C1C1C',
          elevated: '#161616',
        },
        border: {
          subtle: '#2C2C2C',
        },
        text: {
          primary: '#EBEBEB',
          muted: '#888888',
        },
        coral: '#FF6B35',
        teal: '#64FFDA',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
