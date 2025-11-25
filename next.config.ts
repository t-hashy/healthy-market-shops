import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/healthy-shops-instruction' : ''; // Replace with your repository name if deploying to GitHub Pages subpath
const assetPrefix = isProd ? '/healthy-shops-instruction/' : ''; // Replace with your repository name if deploying to GitHub Pages subpath

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  
  // Configure for GitHub Pages deployment
  // Set basePath to your repository name if deploying to a subpath (e.g., https://username.github.io/repo-name)
  // Set assetPrefix to the same value with a trailing slash
  basePath: basePath,
  assetPrefix: assetPrefix,
  trailingSlash: true, // Ensures consistent URL structure for static exports

  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
