import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Otimização da Vercel estourou a cota (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED);
    // os ícones já são PNGs pequenos servidos por CDN.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ddragon.leagueoflegends.com", pathname: "/cdn/**" },
      { protocol: "https", hostname: "cblow.xyz", pathname: "/times/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
