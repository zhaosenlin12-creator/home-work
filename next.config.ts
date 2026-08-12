import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite 是内置模块，无需 external 配置；保留为空配置以备扩展
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
