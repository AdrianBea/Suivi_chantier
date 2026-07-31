import Link from "next/link";
import Nav from "@/components/Nav";

export default function TopBar() {
  return (
    <header style={{ background: "#111", borderBottom: "1px solid #2C2C2C", padding: "0 40px", display: "flex", alignItems: "center", gap: 40, height: 52, position: "sticky", top: 0, zIndex: 10 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: "#F97316", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="7" width="4" height="6" fill="white" rx="0.5"/><rect x="5" y="4" width="4" height="9" fill="white" rx="0.5"/><rect x="9" y="1" width="4" height="12" fill="white" rx="0.5"/></svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EDE8", letterSpacing: "0.02em" }}>CHANTIER</span>
      </Link>
      <Nav />
    </header>
  );
}
