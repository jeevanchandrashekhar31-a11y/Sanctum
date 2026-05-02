/** @type {import('next').NextConfig} */
if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
  throw new Error(
    'ANTHROPIC_API_KEY must stay server-only. Remove NEXT_PUBLIC_ANTHROPIC_API_KEY from your environment.'
  )
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
