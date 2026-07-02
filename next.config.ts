import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
<<<<<<< HEAD
  /* config options here */
=======
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
