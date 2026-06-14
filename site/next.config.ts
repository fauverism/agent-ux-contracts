import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static, file-based site (per CLAUDE.md). No server runtime.
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
