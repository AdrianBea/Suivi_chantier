import type { NextConfig } from "next";

// La destination des rewrites est figée dans routes-manifest.json AU BUILD :
// BACKEND_INTERNAL_URL doit donc exister pendant `next build`, pas seulement au run.
// Sans ce garde-fou, un build prod sans la variable grave "localhost:5096" et
// tout /api/* casse en prod avec un 502 silencieux.
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5096";

if (process.env.NODE_ENV === "production" && !process.env.BACKEND_INTERNAL_URL) {
  throw new Error(
    "BACKEND_INTERNAL_URL manquante au build. Sur Railway : Variables du service front → " +
      "BACKEND_INTERNAL_URL=http://<nom-du-service-backend>.railway.internal:8080",
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
