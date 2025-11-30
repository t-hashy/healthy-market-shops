import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/healthy-market-shops' : '';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  
  // Configure for GitHub Pages deployment
  // Set basePath to your repository name if deploying to a subpath (e.g., https://username.github.io/repo-name)
  // Set assetPrefix to the same value
  basePath: basePath,
  assetPrefix: basePath,

  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
