import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled
  serverExternalPackages: ['ipfs-http-client'],
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for ipfs-http-client and electron dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        electron: false,
      };
    }
    return config;
  },
};

export default nextConfig;
