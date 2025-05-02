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
  basePath: '/yamg/',  // important if your repo is not served from root
  trailingSlash: true,          // helps with routing in static export
  output: 'export', // Enable static export
  distDir: 'out', // Output directory for the static build
};

export default nextConfig;
