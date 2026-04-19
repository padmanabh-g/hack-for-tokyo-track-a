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
          base: '#0A1628',
          surface: '#112240',
          elevated: '#0E1F38',
        },
        border: {
          subtle: '#1E3A5F',
        },
        text: {
          primary: '#E2E8F0',
          muted: '#8BA3BC',
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
