import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imgs.xkcd.com" },
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org" },
      { protocol: "https", hostname: "images.metmuseum.org" },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
