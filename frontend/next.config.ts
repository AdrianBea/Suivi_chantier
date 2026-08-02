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
  // proxy.ts fait bufferiser le body par Next : au-delà de cette limite le corps est
  // TRONQUÉ SANS ERREUR (le backend reçoit un PDF corrompu). Doit rester alignée sur
  // UploadLimits.MaxBytes et MaxRequestBodySize côté backend.
  experimental: { proxyClientMaxBodySize: "25mb" },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  // Pas de CSP : l'app utilise massivement le style inline, une CSP stricte casserait l'UI.
  // nosniff est le garde-fou principal ici — les PDF et pièces jointes sont servis inline
  // depuis la même origine, un fichier stocké ne doit pas pouvoir être réinterprété.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
