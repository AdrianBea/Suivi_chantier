"use client";

import { useParallax } from "@/lib/useParallax";

export function ListPageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  const headerRef = useParallax<HTMLDivElement>(0.1, 16);
  return (
    <div ref={headerRef} className="parallax-layer" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 10, color: "var(--nm-accent)", letterSpacing: "0.18em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 8 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h1>
        <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginTop: 5 }}>{subtitle}</div>
      </div>
      {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: string; color: string; small?: boolean }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 12, marginBottom: 22 }}>
      {stats.map(({ label, value, color, small }, i) => (
        <div key={label} className="nm-card nm-row-in" style={{ padding: "16px 18px", animationDelay: `${i * 40}ms` }}>
          <div style={{ fontSize: 10, color: "var(--nm-text-muted)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: small ? 18 : 26, fontWeight: 700, fontFamily: "monospace", color, letterSpacing: small ? "-0.02em" : undefined }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
      <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="var(--nm-text-faint)" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher…"
        aria-label="Rechercher"
        className="nm-input"
        style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, fontFamily: "inherit" }}
      />
    </div>
  );
}
