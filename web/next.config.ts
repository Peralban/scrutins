import type { NextConfig } from "next";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

// The data API (Bun + SQLite, ../src) runs separately; the browser reaches it through this rewrite.
const API_URL = process.env.API_URL ?? "http://localhost:3001";
// The shared glossary is a local package next to this repo (package.json: file:../../glossaire-politique),
// symlinked into node_modules by the postinstall script. Turbopack only follows that link out of the
// project if its target is declared as an additional root.
const GLOSSAIRE = resolve("../../glossaire-politique");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // It ships TypeScript sources, which Next does not compile in node_modules unless asked.
  transpilePackages: ["glossaire-politique"],
  // This app only (not the Bun API one level up, whose node_modules holds another copy of the link).
  turbopack: { root: resolve(".") },
  experimental: {
    turbopackAdditionalRoots: existsSync(GLOSSAIRE) ? { glossaire: { path: realpathSync(GLOSSAIRE) } } : {},
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
