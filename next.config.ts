import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export', // 静的HTMLを出力する設定
  basePath: isProd ? '/healthy-market-shops' : '',
  assetPrefix: isProd ? '/healthy-market-shops' : undefined,
  images: {
    unoptimized: true, // next/imageを使用する場合、静的エクスポートでは必須
  },
};

export default nextConfig;