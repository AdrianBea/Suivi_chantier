"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsAdmin } from "@/lib/useIsAdmin";

const ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/import", label: "Import" },
  { href: "/parametres", label: "Paramètres" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/aide", label: "Aide" },
];

export default function Nav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  return (
    <nav aria-label="Principal" className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="pressable"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--nm-radius-pill)",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? "var(--nm-accent)" : "var(--nm-text-muted)",
              background: active ? "var(--nm-base)" : "transparent",
              boxShadow: active ? "var(--nm-shadow-pressed-sm)" : "none",
              textDecoration: "none",
              cursor: "pointer",
              transition: "background-color 180ms ease-out, box-shadow 180ms ease-out, color 180ms ease-out",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
