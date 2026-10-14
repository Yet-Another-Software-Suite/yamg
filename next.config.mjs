/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // The deploy workflow builds the 2026 site, on the 2026 branch, under /2026. This site is at the root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  //trailingSlash: false,          // helps with routing in static export
  output: 'export', // Enable static export
  distDir: 'out', // Output directory for the static build
};

export default nextConfig;
