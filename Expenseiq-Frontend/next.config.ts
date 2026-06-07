import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments (optional).
  // Vercel handles this automatically; only needed for self-hosted.
  // output: 'standalone',

  // Strict React mode for catching bugs early
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
