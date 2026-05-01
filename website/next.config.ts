import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'edtsmqjnkakaaujmmhip.supabase.co',
      },
    ],
  },
};

export default nextConfig;
