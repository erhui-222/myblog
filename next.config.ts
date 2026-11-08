import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 不需要 standalone 产物，它的构建系统自己打包函数。
  // 保留选项是为了 Dockerfile 那条自托管路径：构建时传 BUILD_TARGET=docker。
  output: process.env.BUILD_TARGET === "docker" ? "standalone" : undefined,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
