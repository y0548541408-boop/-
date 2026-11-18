import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Bank and credit-card exports for the mapping step are sent one file
      // per request; a few months of history fits well under this.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
