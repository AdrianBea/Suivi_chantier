"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin/comptes", label: "Comptes" },
  { href: "/admin/llm", label: "Analyses IA" },
  { href: "/admin/sante", label: "Santé" },
];

/**
 * Aucun contrôle d'accès ici : le backend répond 403 sur /api/admin/*, et les
 * pages affichent alors le message via ErrorState. Le masquage dans la nav
 * (useIsAdmin) reste du confort d'affichage.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell" style={{ paddingBottom: 0 }}>
        <div style={{ fontSize: 10, color: "var(--nm-accent)", letterSpacing: "0.18em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 8 }}>
          Administration
        </div>
        <nav aria-label="Sections d'administration" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
          {ONGLETS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="pressable touch-target"
                style={{
                  display: "flex", alignItems: "center",
                  padding: "8px 16px",
                  borderRadius: "var(--nm-radius-pill)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--nm-accent)" : "var(--nm-text-muted)",
                  background: active ? "var(--nm-base)" : "transparent",
                  boxShadow: active ? "var(--nm-shadow-pressed-sm)" : "none",
                  textDecoration: "none",
                  transition: "background-color 180ms ease-out, box-shadow 180ms ease-out, color 180ms ease-out",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
