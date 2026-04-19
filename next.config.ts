import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: [],
  outputFileTracingIncludes: {
    '/**': ['./data/**'],
  },
}

export default config
