import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["node-ical", "@prisma/client", "bcryptjs"],
};

export default nextConfig;
