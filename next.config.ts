import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["postgres", "googleapis"],
  // The dev server blocks its own hot-reload socket unless this host is listed,
  // which stops the page from hydrating when opened at 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
