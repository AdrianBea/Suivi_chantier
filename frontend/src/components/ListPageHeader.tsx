export function ListPageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 10, color: "#F97316", letterSpacing: "0.18em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 8 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h1>
        <div style={{ fontSize: 13, color: "#888480", marginTop: 5 }}>{subtitle}</div>
      </div>
      {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: string; color: string; small?: boolean }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 12, marginBottom: 22 }}>
      {stats.map(({ label, value, color, small }) => (
        <div key={label} style={{ background: "#222", border: "1px solid #2C2C2C", borderRadius: 9, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, color: "#888480", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: small ? 18 : 26, fontWeight: 700, fontFamily: "monospace", color, letterSpacing: small ? "-0.02em" : undefined }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
      <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#555250" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="#555250" strokeWidth="2" strokeLinecap="round"/></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher…"
        aria-label="Rechercher"
        style={{ width: "100%", background: "#1E1E1E", border: "1px solid #2C2C2C", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}
      />
    </div>
  );
}
