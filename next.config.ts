import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* existing config options here */
  eslint: {
    ignoreDuringBuilds: true, // ignore ESLint/TS warnings during build
  },
};

export default nextConfig;
