import type { NextConfig } from "next";

const indexable = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing an AGENTS.md file into the project.
  agentRules: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "vectoros.one", pathname: "/assets/**" }],
  },
  async redirects() {
    // The standalone email page was replaced by the email-updates dialog; keep the old URL working.
    return [{ source: "/waitlist", destination: "/#email-updates", permanent: false }];
  },
  async headers() {
    // Preview deployments send X-Robots-Tag as a second guard (see lib/site.ts for the launch switch).
    return indexable ? [] : [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
