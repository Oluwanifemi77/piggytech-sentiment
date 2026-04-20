import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these packages with webpack.
  // apify-client uses dynamic require() calls that the bundler can't handle.
  serverExternalPackages: ["apify-client"],
};

export default nextConfig;
