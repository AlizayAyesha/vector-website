import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing an AGENTS.md file into the project.
  agentRules: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "vectoros.one", pathname: "/assets/**" }],
  },
};

export default nextConfig;
