"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useIsAdmin } from "@/lib/useIsAdmin";

// même logique d'activation que Nav.tsx : exact pour "/", préfixe sinon
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const ICON = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const TABS = [
  { href: "/", label: "Accueil", path: "M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" },
  { href: "/devis", label: "Devis", path: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4" },
  { href: "/factures", label: "Factures", path: "M6 2h12v20l-3-2-3 2-3-2-3 2V2zM9.5 7h5M9.5 11h5M9.5 15h3" },
  { href: "/import", label: "Import", path: "M12 15V3m0 0L8 7m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" },
];

const MORE = [
  { href: "/entreprises", label: "Entreprises" },
  { href: "/parametres", label: "Paramètres" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/aide", label: "Aide" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [showMore, setShowMore] = useState(false);
  const moreItems = MORE.filter((m) => !m.adminOnly || isAdmin);

  // neutralise le scroll de fond quand la feuille est ouverte
  useEffect(() => {
    if (!showMore) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showMore]);

  const moreActive = moreItems.some((m) => isActive(pathname, m.href));

  async function handleLogout() {
    await api.auth.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="show-mobile"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
          display: "flex", alignItems: "stretch",
          background: "var(--nm-base)",
          borderTop: "1px solid var(--nm-border)",
          boxShadow: "0 -2px 14px var(--nm-shadow-dark)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TABS.map(({ href, label, path }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              style={{ ...tabStyle, color: active ? "var(--nm-accent)" : "var(--nm-text-muted)" }}
            >
              <svg {...ICON} stroke="currentColor"><path d={path} /></svg>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          aria-expanded={showMore}
          aria-haspopup="dialog"
          style={{ ...tabStyle, background: "transparent", border: "none", color: moreActive ? "var(--nm-accent)" : "var(--nm-text-muted)", fontFamily: "inherit" }}
        >
          <svg {...ICON} stroke="currentColor"><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="2.6" /></svg>
          <span style={{ fontSize: 10, fontWeight: moreActive ? 600 : 400 }}>Plus</span>
        </button>
      </nav>

      {showMore && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Plus d'options"
          className="show-mobile"
          onClick={() => setShowMore(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(20, 24, 30, 0.55)", display: "flex", alignItems: "flex-end", animation: "fadeIn 200ms ease-out both" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", background: "var(--nm-base)",
              borderRadius: "var(--nm-radius-lg) var(--nm-radius-lg) 0 0",
              padding: `14px 18px calc(18px + env(safe-area-inset-bottom, 0px))`,
              animation: "nm-sheet-up 240ms cubic-bezier(0.32, 0.72, 0, 1) both",
            }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 2, background: "var(--nm-border-strong)", margin: "0 auto 16px" }} />
            {moreItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                style={{
                  display: "flex", alignItems: "center", minHeight: 48, padding: "0 6px",
                  fontSize: 15, textDecoration: "none",
                  color: isActive(pathname, href) ? "var(--nm-accent)" : "var(--nm-text-secondary)",
                  fontWeight: isActive(pathname, href) ? 600 : 400,
                  borderBottom: "1px solid var(--nm-base-sunken)",
                }}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", width: "100%", minHeight: 48, padding: "0 6px", marginTop: 4, background: "transparent", border: "none", color: "var(--nm-danger)", fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  minHeight: 56,
  padding: "8px 2px",
  textDecoration: "none",
  cursor: "pointer",
  transition: "color 180ms ease-out",
};
