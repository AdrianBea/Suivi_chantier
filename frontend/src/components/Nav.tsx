"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/import", label: "Import" },
  { href: "/parametres", label: "Paramètres" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {ITEMS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? "#F0EDE8" : "#888480",
              background: active ? "#2A2A2A" : "transparent",
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
