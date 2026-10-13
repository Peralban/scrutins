import type { NextConfig } from "next";

// The data API (Bun + SQLite, ../src) runs separately; the browser reaches it through this rewrite.
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The shared glossary (github:Peralban/glossaire-politique) ships TypeScript sources, which Next does not compile in node_modules unless asked.
  transpilePackages: ["glossaire-politique"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
