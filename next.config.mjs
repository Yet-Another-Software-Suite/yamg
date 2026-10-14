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
  // Bundle the code templates as text, so that the generator and its templates always come from
  // the same build. Fetching them separately let a page from one deploy load templates from another.
  webpack(config) {
    config.module.rules.push({ test: /\.hbs$/, type: 'asset/source' });
    return config;
  },
  distDir: 'out', // Output directory for the static build
};

export default nextConfig;
